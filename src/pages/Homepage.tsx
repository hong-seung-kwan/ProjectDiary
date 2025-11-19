import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import Modal from "../components/Modal";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
  projectName: string;
  projectId: string;
}

interface DiaryDetail {
  id: string;
  title: string;
  progress: string;
  troubleshooting?: { problem?: string; solution?: string };
  retrospective?: string;
  createdAt: string;
  projectName: string;
  projectId: string;
}

const Homepage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectDate, setSelectDate] = useState<string>("");
  const [selectDiaries, setSelectDiaries] = useState<CalendarEvent[]>([]);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    diaryCount: 0,
    troubleshootingCount: 0,
    projectCount: 0,
    thisMonthDiaryCount: 0,
    thisMonthTroubleCount: 0,
  })
  const [recentDiaries, setRecentDiaries] = useState<DiaryDetail[]>([]);
  const [projects, setProjects] = useState<{id: string; name:string;}[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);

  
  const generateSummaryMessage = () => {
    const { thisMonthDiaryCount, thisMonthTroubleCount } = stats;

    if (thisMonthDiaryCount === 0) {
      return "🗓 이번 달엔 아직 일지가 없습니다. 새로운 기록을 시작해보세요!";
    }
    if (thisMonthDiaryCount <= 2) {
      return `🌱 이번 달엔 ${thisMonthDiaryCount}개의 일지를 작성했어요. 꾸준한 시작이네요!`;
    }
    if (thisMonthDiaryCount <= 5) {
      return `🔥 이번 달엔 ${thisMonthDiaryCount}개의 일지를 남겼어요. ${thisMonthTroubleCount > 0
          ? `${thisMonthTroubleCount}건의 트러블슈팅도 있었네요!`
          : "좋은 흐름이에요!"
        }`;
    }
    return `🌟 이번 달엔 ${thisMonthDiaryCount}개의 일지와 ${thisMonthTroubleCount}건의 트러블슈팅을 기록했어요! 멋진 한 달이에요 👏`;
  };


  // Firestore에서 모든 프로젝트의 일지 불러오기
  useEffect(() => {
    if (!user) return;

    const fetchAllDiaries = async () => {
      const userRef = collection(db, "users", user.uid, "projects");
      const projectSnapshot = await getDocs(userRef);
      const allEvents: CalendarEvent[] = [];

      let diaryCount = 0;
      let troubleshootingCount = 0;
      let thisMonthDiaryCount = 0;
      let thisMonthTroubleCount = 0;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const projectList: {id:string; name:string;}[] = [];

      for (const projectDoc of projectSnapshot.docs) {
        const projectName = projectDoc.data().name;
        projectList.push({id: projectDoc.id, name: projectName})
        const diariesRef = collection(
          db,
          "users",
          user.uid,
          "projects",
          projectDoc.id,
          "diaries"
        );
        const q = query(diariesRef, orderBy("createdAt", "desc"));
        const diariesSnapshot = await getDocs(q);

        diariesSnapshot.forEach((d) => {
          const data = d.data();
          if (data.createdAt) {
            const createdDate = data.createdAt.toDate();
            diaryCount++;
            if (data.troubleshooting?.problem || data.troubleshooting?.solution) {
              troubleshootingCount++;
            }

            if (
              createdDate.getMonth() === currentMonth &&
              createdDate.getFullYear() === currentYear
            ) {
              thisMonthDiaryCount++;
              if (data.troubleshooting?.problem || data.troubleshooting?.solution) {
                thisMonthTroubleCount++;
              }
            }
            allEvents.push({
              id: d.id,
              title: data.title || "(제목 없음)",
              date: data.createdAt.toDate().toISOString().split("T")[0],
              color: "#3b82f6",
              projectName,
              projectId: projectDoc.id,
            });
          }
        });
      }

      setEvents(allEvents);
      setStats({
        diaryCount,
        troubleshootingCount,
        projectCount: projectSnapshot.size,
        thisMonthDiaryCount,
        thisMonthTroubleCount,
      });
      setProjects(projectList);
      const sortedByDate = [...allEvents].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const top3 = sortedByDate.slice(0, 3).map((ev) => ({
        id: ev.id,
        title: ev.title,
        createdAt: ev.date,
        projectName: ev.projectName,
        projectId: ev.projectId,
        progress: "",
        troubleshooting: {},
        retrospective: "",

      }))
      setRecentDiaries(top3)
    };

    fetchAllDiaries();
  }, [user]);

  useEffect(() => {
    if (selectedProject === "all") {
      setFilteredEvents(events);
    } else{
      setFilteredEvents(events.filter(ev => ev.projectId === selectedProject));
    }
  }, [selectedProject, events]);

  // 날짜 클릭 시 해당 날짜의 일지 목록 모달 표시
  const handleDateClick = (info: DateClickArg) => {
    const clickedDate = info.dateStr;
    const diaries = events.filter((d) => d.date === clickedDate);
    setSelectDate(clickedDate);
    setSelectDiaries(diaries);
    setIsListModalOpen(true);
  };

  // 일지 클릭 시 Firestore에서 상세 내용 불러오기
  const handleDiaryClick = async (d: CalendarEvent) => {
    if (!user) return;
    setLoading(true);

    try {
      const diaryRef = doc(
        db,
        "users",
        user.uid,
        "projects",
        d.projectId,
        "diaries",
        d.id
      );
      const diarySnap = await getDoc(diaryRef);

      if (diarySnap.exists()) {
        const data = diarySnap.data();
        setSelectedDiary({
          id: d.id,
          title: data.title || "(제목 없음)",
          progress: data.progress || "",
          troubleshooting: data.troubleshooting || {},
          retrospective: data.retrospective || "",
          createdAt: data.createdAt
            ? data.createdAt.toDate().toLocaleDateString()
            : d.date,
          projectName: d.projectName,
          projectId: d.projectId,
        });
        setIsListModalOpen(false);
        setEditMode(false);
      } else {
        alert("일지를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("일지 불러오기 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 일지 수정 저장
  const handleSaveEdit = async () => {
    if (!user || !selectedDiary) return;
    try {
      const diaryRef = doc(
        db,
        "users",
        user.uid,
        "projects",
        selectedDiary.projectId,
        "diaries",
        selectedDiary.id
      );
      await updateDoc(diaryRef, {
        title: selectedDiary.title,
        progress: selectedDiary.progress,
        troubleshooting: selectedDiary.troubleshooting,
        retrospective: selectedDiary.retrospective,
      });

      alert("일지가 수정되었습니다!");
      setEditMode(false);

      // UI에서도 즉시 반영
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === selectedDiary.id
            ? { ...ev, title: selectedDiary.title }
            : ev
        )
      );
    } catch (error) {
      console.error("수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  // 일지 삭제
  const handleDelete = async () => {
    if (!user || !selectedDiary) return;
    if (!confirm("정말로 이 일지를 삭제하시겠습니까?")) return;

    try {
      const diaryRef = doc(
        db,
        "users",
        user.uid,
        "projects",
        selectedDiary.projectId,
        "diaries",
        selectedDiary.id
      );
      await deleteDoc(diaryRef);

      alert("일지가 삭제되었습니다!");
      setSelectedDiary(null);
      setEvents((prev) => prev.filter((ev) => ev.id !== selectedDiary.id));
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">홈</h1>
        <p className="text-gray-500 mt-1">프로젝트 현황 요약</p>
      </div>


      {/* 이번 달 회고 요약 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-700 mb-1">이번 달 회고 요약</h2>
        <p className="text-gray-700">{generateSummaryMessage()}</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-1">이번 달 작성한 일지</p>
          <h2 className="text-3xl font-bold text-blue-600">{stats.diaryCount}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text0sm mb-1">트러블슈팅 횟수</p>
          <h2 className="text-3xl font-bold text-orange-500">{stats.troubleshootingCount}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text0sm mb-1">진행 중 프로젝트</p>
          <h2 className="text-3xl font-bold text-green-500">{stats.projectCount}</h2>
        </div>
      </div>

      {/* 프로젝트 선택 드롭다운 부분 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">프로젝트별 보기</h2>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">전체 보기</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          height="auto"
          dateClick={handleDateClick}
          events={filteredEvents}
        />
      </div>
      {/* 최근 작성된 일지 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">최근 작성된 일지</h2>

        {recentDiaries.length === 0 ? (
          <p className="text-gray-500 text-center">아직 작성된 일지가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {recentDiaries.map((d) => (
              <li
                key={d.id}
                className="flex justify-between items-center border-b border-gray-100 pb-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() =>
                  handleDiaryClick({
                    id: d.id,
                    title: d.title,
                    date: d.createdAt,
                    color: "",
                    projectId: d.projectId,
                    projectName: d.projectName,
                  })
                }
              >
                <div>
                  <p className="font-medium text-blue-600">{d.title}</p>
                  <p className="text-sm text-gray-500">
                    {d.projectName} | {d.createdAt}
                  </p>
                </div>
                <span className="text-gray-400 text-sm">보기 →</span>
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* 날짜 클릭 시 - 일지 목록 모달 */}
      <Modal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)}>
        <div>
          <h3 className="text-xl font-bold mb-3">{selectDate}의 일지</h3>
          {selectDiaries.length === 0 ? (
            <p className="text-gray-500 text-center">작성된 일지가 없습니다.</p>
          ) : (
            selectDiaries.map((d) => (
              <div
                key={d.id}
                className="border-b border-gray-200 pb-2 mb-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleDiaryClick(d)}
              >
                <p className="text-blue-600 font-medium">{d.title}</p>
                <p className="text-sm text-gray-500">{d.projectName}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* 일지 상세 모달 (읽기 + 수정 + 삭제) */}
      <Modal isOpen={!!selectedDiary} onClose={() => setSelectedDiary(null)}>
        {loading ? (
          <p className="text-center text-gray-500">불러오는 중...</p>
        ) : (
          selectedDiary && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold">{selectedDiary.title}</h2>
                <div className="space-x-2">
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-blue-500 hover:underline"
                    >
                      수정
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <p className="text-gray-500">{selectedDiary.projectName}</p>
              <p className="text-sm text-gray-400 mb-3">
                {selectedDiary.createdAt}
              </p>

              {/* 수정 모드 */}
              {editMode ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={selectedDiary.title}
                    onChange={(e) =>
                      setSelectedDiary({
                        ...selectedDiary,
                        title: e.target.value,
                      })
                    }
                    className="w-full border rounded-md px-3 py-2"
                  />
                  <textarea
                    value={selectedDiary.progress}
                    onChange={(e) =>
                      setSelectedDiary({
                        ...selectedDiary,
                        progress: e.target.value,
                      })
                    }
                    className="w-full border rounded-md px-3 py-2 h-24"
                    placeholder="오늘 진행 내용"
                  />
                  <textarea
                    value={selectedDiary.troubleshooting?.problem || ""}
                    onChange={(e) =>
                      setSelectedDiary({
                        ...selectedDiary,
                        troubleshooting: {
                          ...selectedDiary.troubleshooting,
                          problem: e.target.value,
                        },
                      })
                    }
                    className="w-full border rounded-md px-3 py-2 h-24"
                    placeholder="문제 상황"
                  />
                  <textarea
                    value={selectedDiary.troubleshooting?.solution || ""}
                    onChange={(e) =>
                      setSelectedDiary({
                        ...selectedDiary,
                        troubleshooting: {
                          ...selectedDiary.troubleshooting,
                          solution: e.target.value,
                        },
                      })
                    }
                    className="w-full border rounded-md px-3 py-2 h-24"
                    placeholder="해결 과정"
                  />
                  <textarea
                    value={selectedDiary.retrospective || ""}
                    onChange={(e) =>
                      setSelectedDiary({
                        ...selectedDiary,
                        retrospective: e.target.value,
                      })
                    }
                    className="w-full border rounded-md px-3 py-2 h-24"
                    placeholder="회고"
                  />

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 읽기 모드 */}
                  {selectedDiary.progress && (
                    <>
                      <h4 className="text-blue-600 font-semibold mt-3 mb-1">
                        진행 내용
                      </h4>
                      <p className="whitespace-pre-wrap">
                        {selectedDiary.progress}
                      </p>
                    </>
                  )}

                  {selectedDiary.troubleshooting &&
                    (selectedDiary.troubleshooting.problem ||
                      selectedDiary.troubleshooting.solution) && (
                      <>
                        <h4 className="text-orange-500 font-semibold mt-3 mb-1">
                          트러블슈팅
                        </h4>
                        {selectedDiary.troubleshooting.problem && (
                          <>
                            <p className="font-semibold text-gray-700 mt-2">
                              문제 상황
                            </p>
                            <p>{selectedDiary.troubleshooting.problem}</p>
                          </>
                        )}
                        {selectedDiary.troubleshooting.solution && (
                          <>
                            <p className="font-semibold text-gray-700 mt-2">
                              해결 과정
                            </p>
                            <p>{selectedDiary.troubleshooting.solution}</p>
                          </>
                        )}
                      </>
                    )}

                  {selectedDiary.retrospective && (
                    <>
                      <h4 className="text-green-600 font-semibold mt-3 mb-1">
                        회고
                      </h4>
                      <p className="whitespace-pre-wrap">
                        {selectedDiary.retrospective}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default Homepage;
