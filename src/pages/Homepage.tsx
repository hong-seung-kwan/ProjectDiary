import React, { useState } from 'react'
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";

const Homepage = () => {
  const [events, setEvents] = useState([
    { title: "감모 연패 흐름", date: "2025-11-12", color: "#16a34a" },
    { title: "감모 연승 흐름", date: "2025-11-11", color: "#f97316" }
  ])
  
  const handleDateClick = (info: DateClickArg) => {
    alert(`${info.dateStr} 날짜 클릭됨!`);
  }

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-800'>홈</h1>
        <p className='text-gray-500 mt-1'>프로젝트 현황</p>
      </div>
      {/* 요약 카드 */}
      <div className='grid grid-cols-3 gap-5'>
        <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-100'>
          <p className='text-gray-500 text-sm mb-1'>이번 달 프로젝트</p>
          <h2 className='text-3xl font-bold text-blue-600'>2개</h2>
        </div>

        <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-100'>
          <p className='text-gray-500 text-sm mb-1'>완료율</p>
          <h2 className='text-3xl font-bold text-blue-600'>60%</h2>
        </div>

        <div className='bg-white p-6 rounded-xl shadow-sm border border-gray-100'>
          <p className='text-gray-500 text-sm mb-1'>트러블슈팅</p>
          <h2 className='text-3xl font-bold text-blue-600'>5건</h2>
        </div>
      </div>

      {/* 캘린더 영역 */}
      <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-6'>
        <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView='dayGridMonth'
        locale="ko"
        height="auto"
        dateClick={handleDateClick}
        events={events}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek,dayGridDay"
        }}
        eventDisplay='block'
        eventTextColor='#fff'
        eventBorderColor='transparent'
        dayMaxEvents={2}
        />
      </div>
    </div>
  )
}

export default Homepage