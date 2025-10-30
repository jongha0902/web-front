// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, AlertCircle } from 'lucide-react';
import api from '../utils/axios'; // 설정된 axios 인스턴스 가져오기
import { useError } from '../utils/ErrorContext'; // 에러 핸들링 훅

export default function ChatInterface() {
  // 메시지 목록 상태 (객체 배열: { sender: 'user' | 'bot' | 'error', text: string })
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' } // 초기 메시지
  ]);
  const [inputText, setInputText] = useState(''); // 입력 텍스트 상태
  const [promptType, setPromptType] = useState('1'); // 프롬프트 타입 상태
  const [isWaiting, setIsWaiting] = useState(false); // 응답 대기 상태
  const { showError } = useError(); // 에러 모달 표시 훅
  const chatEndRef = useRef(null); // 채팅 맨 아래로 스크롤하기 위한 ref

  // 헤더와 푸터(입력 영역)의 높이를 측정하기 위한 Ref와 상태
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  // 메시지 목록 변경 시 맨 아래로 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 헤더와 푸터 높이를 측정하는 useEffect
  useEffect(() => {
    const measureHeights = () => {
      setHeaderHeight(headerRef.current?.offsetHeight || 0);
      setFooterHeight(footerRef.current?.offsetHeight || 0);
    };
    measureHeights(); // 초기 측정
    // ResizeObserver를 사용하여 높이 변경 감지
    const headerObserver = new ResizeObserver(measureHeights);
    const footerObserver = new ResizeObserver(measureHeights);
    if (headerRef.current) headerObserver.observe(headerRef.current);
    if (footerRef.current) footerObserver.observe(footerRef.current);

    window.addEventListener('resize', measureHeights); // 창 크기 변경 시에도 측정

    return () => {
        headerObserver.disconnect();
        footerObserver.disconnect();
        window.removeEventListener('resize', measureHeights);
    };
  }, []);

  const handleSendMessage = async () => {
    const prompt = inputText.trim();
    if (!prompt || !['0', '1', '2'].includes(promptType) || isWaiting) {
      if (!['0', '1', '2'].includes(promptType)) {
          showError('⚠️ 유효한 프롬프트 타입을 선택해주세요.');
      }
      return;
    }

    const userMessage = { sender: 'user', text: prompt };
    const loadingMessage = { sender: 'bot', text: '⌛ 로딩 중...' };
    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputText('');
    setIsWaiting(true);

    try {
      // Axios로 JSON POST 요청 (api 인스턴스 사용 및 헤더 추가)
      const response = await api.post(
        "/ask", // Vite 프록시를 위한 상대 경로
        { // Request Body
          query: prompt,
          type: promptType
        },
        { // Axios Request Config
          headers: {
            'X-Skip-Global-Loading': 'true' // 로딩 건너뛰기 헤더
          }
        }
      );

      const botMessage = { sender: 'bot', text: response.data.answer.answer };
      setMessages((prev) => prev.slice(0, -1).concat(botMessage));

    } catch (error) {
      if (error.name !== 'SessionExpiredError') {
          let errorMessageText = '❌ 서버 오류 발생';
          if (error.response?.data?.error) {
            errorMessageText = `🚨 오류 메시지: ${error.response.data.error}`;
          } else if (error.message) {
            errorMessageText = `🚨 오류 메시지: ${error.message}`;
          }
          const errorMessage = { sender: 'error', text: errorMessageText };
          setMessages((prev) => prev.slice(0, -1).concat(errorMessage));
          showError(`API 요청 실패: ${errorMessageText}`);
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
    // 👇 로딩 메시지 텍스트를 상수로 정의 (오타 방지)
    const loadingTextSignature = '⌛ 로딩 중...';
    const isLoading = msg.text === loadingTextSignature;

    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-start gap-2 max-w-[80%]`}>
          {!isUser && (
            <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isError ? 'bg-red-500' : 'bg-gray-300'}`}>
              {isError ? <AlertCircle size={16} className="text-white" /> : <Bot size={16} className="text-gray-600" />}
            </div>
          )}
          <div
            className={`rounded-lg p-3 ${
              isUser ? 'bg-blue-500 text-white' : isError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'
            }`}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {/* 👇 로딩 메시지 렌더링 수정 */}
            {isLoading ? (
              <span>
                {/* 모래시계 이모지를 span으로 감싸고 클래스 적용 */}
                <span className="spin-animation">⌛</span>
                {/* 로딩 텍스트와 점 애니메이션 */}
                {' '}로딩 중<span className="loading-dots"></span>
              </span>
            ) : (
              msg.text
            )}
          </div>
          {isUser && (
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      <div ref={headerRef} className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center gap-2"> {/* 아이콘과 텍스트를 감싸는 div 추가 */}
            <Bot size={20} className="text-gray-700" /> {/* Bot 아이콘 추가 */}
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

      {/* Message Area (Absolute Positioning 적용) */}
      <div
        className="absolute left-0 right-0 overflow-y-auto p-4 space-y-4 bg-gray-50"
        style={{
          top: `${headerHeight}px`, // 측정된 헤더 높이 적용
          bottom: `${footerHeight}px`, // 측정된 푸터 높이 적용
        }}
      >
        {messages.map(renderMessage)}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area (Ref 추가 및 absolute 적용, z-index 추가) */}
      <div ref={footerRef} className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-100 flex-shrink-0 z-10">
        <div className="flex items-end space-x-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
            className="flex-1 border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-40"
            rows={1}
            style={{ minHeight: '40px' }}
            disabled={isWaiting}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50 h-[40px]"
            disabled={!inputText.trim() || isWaiting}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}