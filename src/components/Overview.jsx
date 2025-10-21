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
        const res = await api.get('/apim/overview/stats');
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

    fetchOverviewData();
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
    <div className="space-y-6">
      {/* --- 상단 통계 카드 --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center border-b border-gray-200 pb-2 mb-4">
          <BarChart2 className="w-6 h-6 mr-3 text-blue-500" />
          <h3 className="text-lg font-bold text-gray-800">최근 7일 호출 통계</h3>
        </div>
        <div className="relative h-60">
          {chartData.length > 0 ? (
            <Line options={chartOptions} data={chartJSData} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">[차트 데이터가 없습니다]</div>
          )}
        </div>
      </div>

      {/* --- 추가 콘텐츠 그리드 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 많이 호출된 API TOP 5 */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center border-b border-gray-200 pb-3 mb-4">
            <TrendingUp className="w-6 h-6 mr-3 text-green-500" />
            <h3 className="text-lg font-bold text-gray-800">많이 호출된 API TOP 5</h3>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-sm text-center">
              <thead className="text-xs text-gray-600" style={{backgroundColor: 'rgb(215 236 251)'}}>
                <tr>
                  <th scope="col" className="px-3 py-2 w-16">순위</th>
                  <th scope="col" className="px-3 py-2">API</th>
                  <th scope="col" className="px-3 py-2 w-24">Method</th>
                  <th scope="col" className="px-3 py-2 w-28">호출 횟수</th>
                </tr>
              </thead>
              <tbody>
                {/* 항상 5개의 행 */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const api = topApis[i];
                  return (
                    <tr key={i} className={`bg-white ${api ? 'hover:bg-gray-50' : ''}`}>
                      {/* 순위 */}
                      <td className="px-3 py-1 text-gray-500">{i + 1}</td>
                      {/* API (ID - 이름) */}
                      <td className="px-3 py-1 text-left">
                        {api ? (
                          <div className="text-sm text-gray-500 truncate" title={`${api.api_id} - ${api.api_name}`}>{api.api_id} - {api.api_name}</div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      {/* 메서드 */}
                      <td className="px-3 py-1">
                        {api ? (
                          <span className="px-2 py-0.5 font-mono font-semibold text-blue-600">{api.method}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* 호출 횟수 */}
                      <td className={`px-3 py-1 font-semibold text-center ${api ? 'text-green-600' : 'text-gray-400'}`}>
                        {api ? api.count.toLocaleString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 최근 오류 발생 로그 */}
        <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center border-b border-gray-200 pb-3 mb-4">
            <Ban className="w-6 h-6 mr-3 text-red-500" />
            <h3 className="text-lg font-bold text-gray-800">최근 오류 발생 로그</h3>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '200px' }}>
            <table className="w-full text-sm text-center">
              <thead className="sticky top-0 z-10 text-xs text-gray-600 font-semibold" style={{backgroundColor: 'rgb(215 236 251)'}}>
                  <tr>
                      <th scope="col" className="px-4 py-2 w-[200px]">시간</th>
                      <th scope="col" className="px-4 py-2">API</th>
                      <th scope="col" className="px-4 py-2">Method</th>
                      <th scope="col" className="px-4 py-2">상태</th>
                  </tr>
              </thead>
              <tbody>
                  {recentErrors.length > 0 ? recentErrors.map((error, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-red-50">
                      <td className="px-4 py-2 text-gray-600">{error.time}</td>
                      <td className="px-4 py-2 text-gray-600 truncate text-left" title={`${error.api_id} - ${error.api_name}`}>{error.api_id} - {error.api_name}</td>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">{error.method}</td>
                      <td className="px-4 py-2 font-mono font-semibold text-red-700">{error.status_code}</td>
                  </tr>
                  )) : (
                  <tr>
                      <td colSpan="4" className="py-10 text-gray-400">
                      최근 오류 내역이 없습니다.
                      </td>
                  </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}