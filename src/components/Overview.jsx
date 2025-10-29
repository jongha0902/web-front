import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import { useError } from '../utils/ErrorContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ArrowRightCircle, BarChart2, TrendingUp, Zap, Library, KeyRound, BarChart3, Timer, BellDotIcon, Ban } from 'lucide-react';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

export default function Overview() {
  const [stats, setStats] = useState({
    totalApis: 0,
    totalApiKeys: 0,
    totalCalls: 0,
    todayCalls: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [errorChartData, setErrorChartData] = useState([]);
  const [topApis, setTopApis] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [recentErrors, setRecentErrors] = useState([]);
  const { showError } = useError();

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {

        const res = await api.get(
          "apim/overview/stats",
          { // Axios Request Config
            headers: {
              'X-Skip-Global-Loading': 'true' // 로딩 건너뛰기 헤더
            }
          });

        const data = res.data;
  
        setStats({
          totalApis: data.totalApis || 0,
          totalApiKeys: data.totalApiKeys || 0,
          totalCalls: data.totalCalls || 0,
          todayCalls: data.todayCalls || 0,
        });
  
        setChartData(data.dailyStats || []);
        setErrorChartData(data.dailyErrors || []);
        setTopApis(data.topApis || []);
        setPendingRequests(data.pendingRequests || 0);
        setRecentErrors(data.recentErrors || []);
      } catch (e) {
        const message = e.response?.data?.message || e.message || '데이터 로딩 중 오류가 발생했습니다.';
        showError(`❌ ${message}`);
      }
    };
  
    // 처음 실행
    fetchOverviewData();
  
    // 1분마다 반복 실행
    const intervalId = setInterval(fetchOverviewData, 60 * 1000);
  
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        align: 'center',
      },
      title: {
        display: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => value.toLocaleString(),
        font: {
          weight: 'normal',
        },
        color: '#6b7280'
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        ticks: {
          padding: 20, 
        },
      },
      x: { 
        grid: { 
          display: false 
        },
        offset: false,
        ticks: {
          color: '#6b7280',
        }
      }
    }
  };

  // --- 차트 데이터 가공 로직 수정 ---
  // dailyStats를 기준으로 전체 날짜 목록(labels) 생성
  const labels = chartData.map(d => d.date);

  // Map을 생성하여 날짜별 데이터에 빠르게 접근
  const dailyMap = new Map(chartData.map(d => [d.date, d.count]));
  const errorMap = new Map(errorChartData.map(d => [d.date, d.count]));

  // 전체 날짜(labels)를 기준으로 순회하며, 데이터가 없는 날짜는 0으로 채움
  const completeDailyData = labels.map(date => dailyMap.get(date) || 0);
  const completeErrorData = labels.map(date => errorMap.get(date) || 0);
  // ---------------------------------

  const chartJSData = {
    labels: labels,
    datasets: [
      {
        fill: true,
        label: '전체 호출 수',
        data: completeDailyData,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.3,
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)',
      },
      {
        fill: true,
        label: '호출 오류 수',
        data: completeErrorData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.3,
        pointBackgroundColor: 'rgb(255, 99, 132)',
        pointBorderColor: '#fff',
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(255, 99, 132)',
      },
    ],
  };
  
  const statCards = [
    { label: '총 API 수', value: stats.totalApis, Icon: Library, color: 'text-blue-500' },
    { label: '총 발급 키 수', value: stats.totalApiKeys, Icon: KeyRound, color: 'text-green-500' },
    { label: '총 호출 수', value: stats.totalCalls, Icon: BarChart3, color: 'text-purple-500' },
    { label: '오늘 호출 수', value: stats.todayCalls, Icon: Timer, color: 'text-orange-500' },
    { label: 'API 권한 신청', value: pendingRequests, Icon: BellDotIcon, color: 'text-yellow-500', isLink: true, linkTo: '/apiPermissionManage' }
  ];

  return (
    <div className="flex flex-col flex-1 h-full gap-6 min-h-0">
      {/* --- 상단 통계 카드 --- */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map(({ label, value, Icon, color, isLink, linkTo }) => (
          <div key={label} className="bg-white p-3 rounded-lg shadow-sm flex flex-col justify-between">
            {/* 상단 헤더 */}
            <div className="flex items-center border-b border-gray-200">
              <div className={`p-2 rounded-lg ${color} mr-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-gray-700">{label}</p>
            </div>

            {/* 하단 콘텐츠 */}
            <div className="flex-1 flex text-center items-end pt-2">
              {isLink ? (
                <Link to={linkTo} className="w-full flex items-center justify-between p-1 rounded-lg transition">
                  <div className="flex-grow text-center">
                    <p className="text-3xl font-bold">{value}<span className="text-xl font-normal">건</span></p>
                  </div>
                  <ArrowRightCircle className="w-7 h-7 text-yellow-600 hover:text-yellow-700" />
                </Link>
              ) : (
                <div className="w-full p-1">
                  <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- 최근 7일 호출 통계 라인 차트 --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm flex-1 flex flex-col min-h-0 min-h-[250px]">
        <div className="flex items-center border-b border-gray-200 pb-2 mb-4">
          <BarChart2 className="w-6 h-6 mr-3 text-blue-500" />
          <h3 className="text-lg font-bold text-gray-800">최근 7일 호출 통계</h3>
        </div>
        <div className="relative flex-1 min-h-0">
          {chartData.length > 0 ? (
            <Line options={chartOptions} data={chartJSData} />
          ) : (
            /* [데이터 없음] 메시지가 중앙에 오도록 h-full을 absolute/inset-0으로 변경하는 것을 권장합니다 */
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">[차트 데이터가 없습니다]</div>
          )}
        </div>
      </div>

      {/* --- 추가 콘텐츠 그리드 --- */}
      <div className="grid grid-cols-2 gap-6">
        {/* 많이 호출된 API TOP 5 */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {/* 상단 타이틀 */}
          <div className="flex items-center border-b border-gray-200 pb-3">
            <TrendingUp className="w-6 h-6 mr-3 text-green-500" />
            <h3 className="text-lg font-bold text-gray-800">금일 호출 API TOP 5</h3>
          </div>

          {/* 헤더 */}
          <div className="flex items-center py-2 text-xs font-semibold text-gray-700 border-b border-gray-100 mb-2 text-center">
            <div className="w-5">#</div>
            <div className="w-20">Method</div>
            <div className="flex-1 pl-2">API</div>
            <div className="w-[100px]">호출 수</div>
          </div>

          {/* 리스트 */}
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const api = topApis[i];
              const maxCount = Math.max(...topApis.map(api => api?.count || 0));
              const percent = api ? (api.count / maxCount) * 100 : 0;

              return (
                <div key={i} className="flex items-center font-mono font-semibold">
                  {/* 순위 */}
                  <div className="w-5 text-center text-gray-500 text-sm">{i + 1}</div>

                  {/* Method */}
                  <div className="w-20 text-center">
                    {api ? (
                      <span className="inline-block px-2 pb-0.5 rounded text-blue-600 text-sm">
                        {api.method}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>

                  {/* API 막대 + 이름 */}
                  <div className="flex-1 relative h-7 bg-gray-100 rounded-full overflow-hidden">
                    {api && (
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-100 to-sky-200 transition-all duration-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    )}
                    <div className="relative z-10 h-full flex items-center px-3 font-semibold">
                      <span className="text-xs truncate w-full text-gray-500" title={api ? `${api.api_id} - ${api.api_name}` : ''}>
                        {api ? `${api.api_id} - ${api.api_name}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* 호출 수 */}
                  <div className="w-[100px] text-center text-gray-500 ml-2">
                    {api ? `${api.count.toLocaleString()}` : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* 금일 오류 발생 로그 */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {/* 상단 타이틀 */}
          <div className="flex items-center border-b border-gray-200 pb-3">
            <Ban className="w-6 h-6 mr-3 text-red-500" />
            <h3 className="text-lg font-bold text-gray-800">금일 오류 발생 로그</h3>
          </div>

          {/* 헤더 */}
          <div className="flex items-center py-2 text-xs font-semibold text-gray-700 border-b border-gray-100 text-center">
            <div className="w-[200px]">시간</div>
            <div className="w-[80px]">상태</div>
            <div className="w-20">Method</div>
            <div className="flex-1 pl-2">API</div>
          </div>

          {/* 리스트 */}
          <div className="space-y-2 mt-2 max-h-[180px] overflow-y-auto">
            {recentErrors.length > 0 ? recentErrors.map((error, i) => (
              <div key={i} className="flex items-center font-mono text-sm py-1 rounded hover:bg-red-50">
                {/* 시간 */}
                <div className="w-[200px] text-gray-600 text-center">{error.time}</div>
                
                {/* 상태 코드 */}
                <div className="w-[80px] text-center font-semibold text-red-700">
                  {error.status_code}
                </div>

                {/* Method */}
                <div className="w-20 text-center">
                  <span className="inline-block px-2 pb-0.5 text-blue-600 text-sm font-semibold">
                    {error.method}
                  </span>
                </div>

                {/* API 이름 */}
                <div className="flex-1 pl-2 truncate text-gray-600 text-sm font-semibold" title={`${error.api_id} - ${error.api_name}`}>
                  {`${error.api_id} - ${error.api_name}`}
                </div>

              </div>
            )) : (
              <div className="text-center text-sm text-gray-400 py-10">
                최근 오류 내역이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}