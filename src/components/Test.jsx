import React, { useReducer } from 'react';

function reducer(state, action) {
    switch(action.type) {
        case 'INCREMENT':
            return { count: state.count + 1 };
        case 'DECREMENT':
            return { count: state.count - 1 };
        case 'RESET':
            return { count: 0 };
        default:
            return state;
    }
}

// 2. 초기 상태
const initialState = { count: 0 };

// 3. 컴포넌트
function Test() {
  const [state, setState] = useReducer(reducer, initialState);

  return (
    // 전체 컨테이너
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-xs p-8 bg-white rounded-2xl shadow-xl text-center">
        
        {/* 타이틀 */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Reducer 테스트
        </h1>
        
        {/* 숫자 표시 부분 */}
        <p className="text-7xl font-bold text-indigo-600 my-8">
          {state.count}
        </p>
        
        {/* 버튼 그룹 (증가, 감소) */}
        <div className="flex justify-center gap-4 mb-6">
          <button 
            className="flex-1 py-3 px-5 font-semibold text-white bg-indigo-500 rounded-lg shadow-md
                       hover:bg-indigo-600 active:scale-95 transition-all"
            onClick={() => setState({ type: 'INCREMENT' })}
          >
            ➕ 증가
          </button>
          <button 
            className="flex-1 py-3 px-5 font-semibold text-white bg-red-500 rounded-lg shadow-md
                       hover:bg-red-600 active:scale-95 transition-all"
            onClick={() => setState({ type: 'DECREMENT' })}
          >
            ➖ 감소
          </button>
        </div>
        
        {/* 초기화 버튼 */}
        <button 
          className="w-full py-3 px-5 font-semibold text-gray-700 bg-gray-200 rounded-lg shadow-md
                     hover:bg-gray-300 active:scale-95 transition-all"
          onClick={() => setState({ type: 'RESET' })}
        >
          초기화
        </button>
        
      </div>
    </div>
  );
}

export default Test;