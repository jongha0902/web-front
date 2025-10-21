// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, AlertCircle } from 'lucide-react';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }
  ]);
  const [inputText, setInputText] = useState('');
  //promptType 초기값과 옵션 ---
  const [promptType, setPromptType] = useState('0'); // 기본값으로 설정
  const [isWaiting, setIsWaiting] = useState(false);
  const { showError } = useError();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const prompt = inputText.trim();
    // promptType 유효성 검사 ---
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
      const response = await api.post("/ask", {
        query: prompt,
        type: promptType
      });

      const botMessage = { sender: 'bot', text: response.data.answer.answer };
      setMessages((prev) => prev.slice(0, -1).concat(botMessage));

    } catch (error) {
      let errorMessageText = '❌ 서버 오류 발생';
      if (error.response?.data?.error) {
        errorMessageText = `🚨 오류 메시지: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessageText = `🚨 오류 메시지: ${error.message}`;
      }
      const errorMessage = { sender: 'error', text: errorMessageText };
      setMessages((prev) => prev.slice(0, -1).concat(errorMessage));
      showError(`API 요청 실패: ${errorMessageText}`);

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
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} // 자동 줄바꿈 및 단어 단위 줄바꿈
          >
           {msg.text}
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">LLM 대화</h2>
        <div className="flex items-center space-x-2">
           <label htmlFor="promptType" className="text-sm font-medium text-gray-700">프롬프트 타입:</label>
           <select
             id="promptType"
             value={promptType}
             onChange={(e) => setPromptType(e.target.value)}
             className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             disabled={isWaiting}
           >
             <option value="0">RAG_양식</option>
             <option value="1">RAG</option>
             <option value="2">일반</option>
           </select>
         </div>
      </div>

      {/* 메시지 표시 영역 */}
      {/* 👇 flex-1, overflow-y-auto 유지, min-h-0 추가 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0 flex-shrink-0">
        {messages.map(renderMessage)}
        <div ref={chatEndRef} />
      </div>

      {/* 입력 영역 */}
      {/* 👇 flex-shrink-0 추가 */}
      <div className="p-4 border-t bg-gray-100 flex-shrink-0">
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