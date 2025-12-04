import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, AlertCircle, Paperclip, X, Copy, Check } from 'lucide-react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';

const ALLOWED_EXTENSIONS = [
  '.txt', '.csv', '.md', '.log',
  '.pdf',
  '.xml', '.jsp', '.html',
  '.xlsx', '.xls'
];
const MAX_FILES = 3;

// ✅ 간단한 UUID 생성 함수 (외부 라이브러리 없이 구현)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [files, setFiles] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  // ✅ 세션 ID 상태 관리 (localStorage에서 불러오거나 새로 생성)
  const [sessionId, setSessionId] = useState(() => {
    //const savedSession = localStorage.getItem('chat_session_id');
    //return savedSession || generateUUID();
    return generateUUID();
  });

  const fileInputRef = useRef(null);
  const { showError } = useError();
  const chatEndRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const textareaRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  // ✅ 세션 ID가 변경되거나 생성되면 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('chat_session_id', sessionId);
  }, [sessionId]);

  // 텍스트 포맷팅
  const formatText = (text) => {
    if (!text) return "";
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ');
  };

  const handleCopy = async (text, index) => {
    try {
      const cleanText = formatText(text);
      await navigator.clipboard.writeText(cleanText);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

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

  const handleSendMessage = async () => {
    const prompt = inputText.trim();

    if ((!prompt && files.length === 0) || isWaiting) {
      return;
    }

    const attachedFilesInfo = files.map(f => ({ name: f.name }));

    const userMessage = { 
      sender: 'user', 
      text: prompt, 
      attachedFiles: attachedFilesInfo
    };
    
    const loadingMessage = { sender: 'bot', text: '⌛ 로딩 중...' };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsWaiting(true);

    try {
      const formData = new FormData();
      formData.append('query', prompt);
      
      // ✅ 동적으로 생성된 sessionId 사용
      formData.append('session_id', sessionId);
      
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
      
      console.log(response);
      
      const botMessage = { sender: 'bot', text: response.data.answer };
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
          } else if (error.response?.data?.detail) {
             errorMessageText = `${error.response.data.detail}`;
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
    const isUser = msg.sender === 'user';
    const isBot = msg.sender === 'bot';
    const isError = msg.sender === 'error';
    const loadingTextSignature = '⌛ 로딩 중...';
    const isLoading = msg.text === loadingTextSignature;
    const isCopied = copiedIndex === index;

    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-end gap-2 max-w-[80%] ${isUser ? 'flex-row' : 'flex-row'}`}>
          
          {/* 1. 봇 아이콘 */}
          {!isUser && (
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mb-1 ${isError ? 'bg-red-500' : 'bg-gray-300'}`}>
              {isError ? <AlertCircle size={18} className="text-white" /> : <Bot size={18} className="text-gray-600" />}
            </div>
          )}

          {/* 2. 사용자용 복사 버튼 */}
          {isUser && !isLoading && (
             <button 
                onClick={() => handleCopy(msg.text, index)}
                className="mb-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="메시지 복사"
             >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
             </button>
          )}

          {/* 3. 메시지 말풍선 */}
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
              <>
                {/* 텍스트 내용 */}
                {formatText(msg.text)}

                {/* 첨부 파일 목록 표시 */}
                {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                  <div className={`mt-2 pt-2 border-t ${isUser ? 'border-white/30' : 'border-gray-300'} space-y-1`}>
                    {msg.attachedFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-2 p-1 rounded ${isUser ? 'bg-white/20' : 'bg-white'} text-xs`}
                        title={file.name} 
                      >
                        <Paperclip size={12} className="flex-shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {file.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 4. 봇용 복사 버튼 */}
          {!isUser && !isLoading && !isError && (
             <button 
                onClick={() => handleCopy(msg.text, index)}
                className="mb-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="답변 복사"
             >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
             </button>
          )}

          {/* 5. 사용자 아이콘 */}
          {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mb-1">
              <User size={18} className="text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div ref={headerRef} className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-800">전력AI 봇</h2>
        </div>
      </div>

      {/* Message Area */}
      <div
        className="absolute left-0 right-0 overflow-y-auto p-4 space-y-4 bg-gray-50"
        style={{ top: `${headerHeight}px`, bottom: `${footerHeight}px` }}
      >
        {messages.map(renderMessage)}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div ref={footerRef} className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-100 flex-shrink-0 z-10">
        
        {/* 파일 목록 미리보기 */}
        {files.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="bg-gray-200 text-gray-700 text-sm rounded-full px-3 py-1 flex items-center gap-2"
                title={file.name} 
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

          <button
            onClick={handleAttachClick}
            className="border border-gray-300 hover:bg-gray-200 text-gray-600 p-2 rounded-lg h-[40px] flex-shrink-0"
            disabled={isWaiting}
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </button>

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