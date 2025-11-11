// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, AlertCircle, Paperclip, X } from 'lucide-react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import { useMessage } from '../utils/MessageContext';

const ALLOWED_EXTENSIONS = [
  '.txt', '.csv', '.md', '.log', // 텍스트
  '.pdf',                     // PDF
  '.xml', '.jsp', '.html',     // 웹/데이터
  '.xlsx', '.xls'             // 엑셀
];
const MAX_FILES = 3;


export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [promptType, setPromptType] = useState('1');
  const [isWaiting, setIsWaiting] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const { showError } = useError();
  const { showMessage } = useMessage();
  const chatEndRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  // 👇 textarea의 DOM에 접근하기 위한 ref 생성
  const textareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const measureHeights = () => {
      setHeaderHeight(headerRef.current?.offsetHeight || 0);
      setFooterHeight(footerRef.current?.offsetHeight || 0);
    };
    measureHeights();
    const headerObserver = new ResizeObserver(measureHeights);
    const footerObserver = new ResizeObserver(measureHeights);
    if (headerRef.current) headerObserver.observe(headerRef.current);
    if (footerRef.current) footerObserver.observe(footerRef.current);
    window.addEventListener('resize', measureHeights);
    return () => {
      headerObserver.disconnect();
      footerObserver.disconnect();
      window.removeEventListener('resize', measureHeights);
    };
  }, []);

  // 프롬프트 타입 '1'로 변경 시 파일 목록 초기화
  useEffect(() => {
    if (promptType === '1') {
        setFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  }, [promptType]);

  // 👇 텍스트 입력에 따라 textarea 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      // 1. 높이를 'auto'로 초기화 (텍스트가 줄어들 때 높이도 줄어들게 함)
      textareaRef.current.style.height = 'auto'; 
      // 2. scrollHeight (내용 높이)를 픽셀 단위로 style.height에 설정
      // (className의 max-h-[200px]가 200px 이상 커지는 것을 막아줌)
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 검증 로직
  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length >= MAX_FILES) {
      showError(`⚠️ 파일은 최대 ${MAX_FILES}개까지만 첨부할 수 있습니다.`);
      return;
    }

    const validFiles = [];
    const invalidFileNames = [];

    Array.from(selectedFiles).forEach(file => {
      const fileName = file.name;
      const lastDotIndex = fileName.lastIndexOf('.');
      
      if (lastDotIndex === -1) {
        invalidFileNames.push(fileName); 
        return;
      }
      const fileExt = fileName.slice(lastDotIndex).toLowerCase();
      
      if (ALLOWED_EXTENSIONS.includes(fileExt)) {
        validFiles.push(file);
      } else {
        invalidFileNames.push(fileName); 
      }
    });

    const spaceAvailable = MAX_FILES - files.length;
    const filesToAdd = validFiles.slice(0, spaceAvailable);
    const filesRejectedDueToLimit = validFiles.slice(spaceAvailable);

    if (filesToAdd.length > 0) {
      setFiles((prevFiles) => [...prevFiles, ...filesToAdd]);
    }

    const errorMessages = [];
    if (invalidFileNames.length > 0) {
      errorMessages.push(`지원하지 않는 파일 형식:\n${invalidFileNames.join('\n')}\n\n(지원: ${ALLOWED_EXTENSIONS.join(', ')})`);
    }
    if (filesRejectedDueToLimit.length > 0) {
      errorMessages.push(`최대 ${MAX_FILES}개를 초과하여 ${filesRejectedDueToLimit.length}개의 파일이 제외되었습니다.`);
    }
    if (errorMessages.length > 0) {
      showError(errorMessages.join('\n\n'));
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  // (파일 개수 3개 초과 검사 로직 제거됨 - handleFileChange에서 처리)
  const handleSendMessage = async () => {
        const prompt = inputText.trim();
    
        if ((!prompt && files.length === 0) || !['0', '1', '2'].includes(promptType) || isWaiting) {
          if (!['0', '1', '2'].includes(promptType)) {
            showError('⚠️ 유효한 프롬프트 타입을 선택해주세요.');
          }
          return;
        }

        // (파일 개수 검증 제거됨)
    
        let userMessageText = prompt;
        if (files.length > 0 && !prompt) {
          userMessageText = `[파일 ${files.length}개 전송]`;
        } else if (files.length > 0 && prompt) {
          userMessageText = `${prompt}\n[파일 ${files.length}개 첨부]`;
        }
    
        const userMessage = { sender: 'user', text: userMessageText };
        const loadingMessage = { sender: 'bot', text: '⌛ 로딩 중...' };
    
        setMessages((prev) => [...prev, userMessage, loadingMessage]);
        setIsWaiting(true);
    
        try {
          const formData = new FormData();
          formData.append('query', prompt);
          formData.append('type', promptType);
          
          if (files.length > 0) {
            files.forEach((file) => {
              formData.append('file', file);
            });
          }
    
          const response = await api.post(
            "/ask",
            formData,
            {
              headers: {
                'X-Skip-Global-Loading': 'true'
              }
            }
          );
    
          const botMessage = { sender: 'bot', text: response.data.answer.answer };
          setMessages((prev) => prev.slice(0, -1).concat(botMessage));
    
          setInputText('');
          setFiles([]);
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
    
        } catch (error) {
          if (error.name !== 'SessionExpiredError') {
              let errorMessageText = '❌ 서버 오류 발생';

              if (error.response?.data?.message) { 
                errorMessageText = `${error.response.data.message}`;
              }
              
              const errorMessage = { sender: 'error', text: errorMessageText };
              setMessages((prev) => prev.slice(0, -1).concat(errorMessage));
              showError(errorMessageText);
          }
        } finally {
          setIsWaiting(false);
        }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg, index) => {
    // ... renderMessage ...
    const isUser = msg.sender === 'user';
    const isBot = msg.sender === 'bot';
    const isError = msg.sender === 'error';
    const loadingTextSignature = '⌛ 로딩 중...';
    const isLoading = msg.text === loadingTextSignature;

    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-start gap-2 max-w-[80%]`}>
          {!isUser && (
            <div className={`mt-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isError ? 'bg-red-500' : 'bg-gray-300'}`}>
              {isError ? <AlertCircle size={16} className="text-white" /> : <Bot size={16} className="text-gray-600" />}
            </div>
          )}
          <div
            className={`rounded-lg p-3 ${
              isUser ? 'bg-blue-500 text-white' : isError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'
            }`}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {isLoading ? (
              <span>
                <span className="spin-animation">⌛</span>
                {' '}로딩 중<span className="loading-dots"></span>
              </span>
            ) : (
              msg.text
            )}
          </div>
          {isUser && (
            <div className="mt-3 flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* ... Header ... */}
      <div ref={headerRef} className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-800">전력AI 봇</h2>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="promptType" className="text-sm font-medium text-gray-700">프롬프트 타입:</label>
          <select
            id="promptType"
            value={promptType}
            onChange={(e) => setPromptType(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isWaiting}
          >
            <option value="1">전력거래</option>
            <option value="2">일반</option>
          </select>
        </div>
      </div>

      {/* ... Message Area ... */}
      <div
        className="absolute left-0 right-0 overflow-y-auto p-4 space-y-4 bg-gray-50"
        style={{ top: `${headerHeight}px`, bottom: `${footerHeight}px` }}
      >
        {messages.map(renderMessage)}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div ref={footerRef} className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-100 flex-shrink-0 z-10">
        
        {promptType === '2' && files.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="bg-gray-200 text-gray-700 text-sm rounded-full px-3 py-1 flex items-center gap-2"
              >
                <Paperclip size={14} />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button 
                  onClick={() => handleRemoveFile(index)}
                  className="ml-1 text-gray-500 hover:text-gray-800"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end space-x-2">
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            onClick={(e) => { 
              e.target.value = null 
            }}
            className="hidden"
            multiple
            accept={ALLOWED_EXTENSIONS.join(',')}
          />

          {promptType === '2' && (
            <button
              onClick={handleAttachClick}
              className="border border-gray-300 hover:bg-gray-200 text-gray-600 p-2 rounded-lg h-[40px] flex-shrink-0"
              disabled={isWaiting}
              aria-label="Attach file"
            >
              <Paperclip size={20} />
            </button>
          )}

          <textarea
            ref={textareaRef} 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
            className="flex-1 border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[150px] overflow-y-auto"
            rows={1}
            disabled={isWaiting}
          />
          <button
            onClick={handleSendMessage}
            // 👇 버튼 높이를 고정 h-[40px] 대신 h-full로 변경 (textarea와 함께 정렬됨)
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50 h-[40px] flex-shrink-0"
            disabled={(!inputText.trim() && files.length === 0) || isWaiting}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}