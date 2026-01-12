import { lazy, Suspense, useEffect, useState } from "react";
const FullCalendar = lazy(() => import("@fullcalendar/react"));
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import Modal from "../components/Modal";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
  extendedProps: {
    projectName: string;
    projectId: string;
  };
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
  const [selectedDiary, setSelectedDiary] = useState<DiaryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    diaryCount: 0,
    troubleshootingCount: 0,
    projectCount: 0,
    thisMonthDiaryCount: 0,
    thisMonthTroubleCount: 0,
  });
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaries, setRecentDiaries] = useState<DiaryDetail[]>([]);
  const navigate = useNavigate();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);

  // 요약 문구 생성
  const generateSummaryMessage = () => {
    const { thisMonthDiaryCount, thisMonthTroubleCount } = stats;

    if (thisMonthDiaryCount === 0)
      return "🗓 이번 달엔 아직 일지가 없습니다. 새로운 기록을 시작해보세요!";
    if (thisMonthDiaryCount <= 2)
      return `🌱 이번 달엔 ${thisMonthDiaryCount}개의 일지를 작성했어요. 꾸준한 시작이네요!`;
    if (thisMonthDiaryCount <= 5)
      return `🔥 이번 달엔 ${thisMonthDiaryCount}개의 일지를 남겼어요. ${thisMonthTroubleCount > 0
        ? `${thisMonthTroubleCount}건의 트러블슈팅도 있었네요!`
        : "좋은 흐름이에요!"
        }`;
    return `🌟 이번 달엔 ${thisMonthDiaryCount}개의 일지와 ${thisMonthTroubleCount}건의 트러블슈팅을 기록했어요! 멋진 한 달이에요 👏`;
  };
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "" }>({
    message: "",
    type: "",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCalendarReady(true);
    })
    return () => cancelAnimationFrame(id);
  }, []);

  // Firestore에서 모든 프로젝트 + 일지 불러오기
  useEffect(() => {
    if (!user || !calendarReady) return;

    const fetchAllDiaries = async () => {
      const userRef = collection(db, "users", user.uid, "projects");
      const projectSnapshot = await getDocs(userRef);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const projectList = projectSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));

      // 병렬로 모든 다이어리 데이터 가져오기
      const diarySnapshots = await Promise.all(
        projectSnapshot.docs.map(async (projectDoc) => {
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
          return {
            projectId: projectDoc.id,
            projectName: projectDoc.data().name,
            diariesSnapshot,
          };
        })
      );

      const allEvents: CalendarEvent[] = [];
      let diaryCount = 0;
      let troubleshootingCount = 0;
      let thisMonthDiaryCount = 0;
      let thisMonthTroubleCount = 0;

      diarySnapshots.forEach(({ projectId, projectName, diariesSnapshot }) => {
        diariesSnapshot.forEach((d) => {
          const data = d.data();
          if (data.createdAt) {
            const createdDate = data.createdAt.toDate();
            diaryCount++;
            if (data.troubleshooting?.problem || data.troubleshooting?.solution)
              troubleshootingCount++;

            if (
              createdDate.getMonth() === currentMonth &&
              createdDate.getFullYear() === currentYear
            ) {
              thisMonthDiaryCount++;
              if (data.troubleshooting?.problem || data.troubleshooting?.solution)
                thisMonthTroubleCount++;
            }

            allEvents.push({
              id: d.id,
              title: data.title || "(제목 없음)",
              date: data.createdAt.toDate().toISOString().split("T")[0],
              color: "#3b82f6",
              extendedProps: {
                projectName,
                projectId,
              },
            });
          }
        });
      });

      // 상태 업데이트
      setStats({
        diaryCount,
        troubleshootingCount,
        projectCount: projectSnapshot.size,
        thisMonthDiaryCount,
        thisMonthTroubleCount,
      });
      setProjects(projectList);
      setEvents(allEvents);

      // 최근 일지 3개 정렬
      const sortedByDate = allEvents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const top3 = sortedByDate.slice(0, 3).map(ev => ({
        id: ev.id,
        title: ev.title,
        createdAt: ev.date,
        projectName: ev.extendedProps.projectName,
        projectId: ev.extendedProps.projectId,
        progress: "",
        troubleshooting: {},
        retrospective: "",
      }));
      setRecentDiaries(top3);
    };


    fetchAllDiaries();
  }, [user, calendarReady]);

  // 프로젝트 필터링
  useEffect(() => {
    if (selectedProject === "all") setFilteredEvents(events);
    else
      setFilteredEvents(
        events.filter((ev) => ev.extendedProps.projectId === selectedProject)
      );
  }, [selectedProject, events]);

  // 이벤트 클릭 시 상세 모달 표시
  const handleEventClick = async (info: EventClickArg) => {
    if (!user) return;
    setLoading(true);

    const { id, extendedProps } = info.event;
    const { projectId, projectName } = extendedProps as {
      projectId: string;
      projectName: string;
    };

    try {
      const diaryRef = doc(
        db,
        "users",
        user.uid,
        "projects",
        projectId,
        "diaries",
        id
      );
      const diarySnap = await getDoc(diaryRef);

      if (diarySnap.exists()) {
        const data = diarySnap.data();
        setSelectedDiary({
          id,
          title: data.title || "(제목 없음)",
          progress: data.progress || "",
          troubleshooting: data.troubleshooting || {},
          retrospective: data.retrospective || "",
          createdAt: data.createdAt
            ? data.createdAt.toDate().toLocaleDateString()
            : "",
          projectId,
          projectName,
        });
      } else {
        alert("일지를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("일지 상세 불러오기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 일지 삭제
  const handleDelete = async () => {
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
      await deleteDoc(diaryRef);

      showToast("일지가 삭제되었습니다!", "success");
      setSelectedDiary(null);
      setConfirmModalOpen(false);
      setEvents((prev) => prev.filter((ev) => ev.id !== selectedDiary.id));
    } catch (error) {
      console.error("삭제 실패:", error);
      showToast("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteClick = () => {
    setConfirmModalOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">홈</h1>
        <p className="text-gray-500 mt-1">프로젝트 현황 요약</p>
      </div>

      {/* 이번 달 요약 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-700 mb-1">이번 달 회고 요약</h2>
        <p className="text-gray-700">{generateSummaryMessage()}</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-gray-500 text-sm mb-1">작성한 일지</p>
          <h2 className="text-3xl font-bold text-blue-600">{stats.diaryCount}</h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-gray-500 text-sm mb-1">트러블슈팅 횟수</p>
          <h2 className="text-3xl font-bold text-orange-500">
            {stats.troubleshootingCount}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-gray-500 text-sm mb-1">진행 중 프로젝트</p>
          <h2 className="text-3xl font-bold text-green-500">
            {stats.projectCount}
          </h2>
        </div>
      </div>

      {/* 프로젝트 선택 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">프로젝트별 보기</h2>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">전체 보기</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {calendarReady ? (
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-64 text-blue-500 font-medium animate-pulse">
                📅 캘린더 불러오는 중입니다...
              </div>
            }
          >
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="ko"
              height={500}
              eventClick={handleEventClick}
              events={filteredEvents}
            />
          </Suspense>
        ) : (
          <div className="flex justify-center items-center h-40 text-gray-400">
            📅 캘린더 로딩 준비 중...
          </div>
        )}
      </div>


      {/* 최근 일지 */}
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
                  handleEventClick({
                    event: {
                      id: d.id,
                      extendedProps: {
                        projectId: d.projectId,
                        projectName: d.projectName,
                      },
                    },
                  } as unknown as EventClickArg)
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

      {/* 일지 상세 모달 */}
      <Modal isOpen={!!selectedDiary} onClose={() => setSelectedDiary(null)}>
        {loading ? (
          <p className="text-center text-gray-500">불러오는 중...</p>
        ) : (
          selectedDiary && (
            <div className="transition-all duration-300 ease-in-out">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedDiary.title}</h2>
                  <p className="text-sm text-gray-400">
                    {selectedDiary.projectName} | {selectedDiary.createdAt}
                  </p>
                </div>

                <div className="space-x-3">
                  <button
                    onClick={() => {
                      navigate("/diary-write", {
                        state: {
                          editDiary: selectedDiary,
                          projectId: selectedDiary.projectId,
                          projectName: selectedDiary.projectName,
                        },
                      });
                      setSelectedDiary(null);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    수정
                  </button>

                  <button
                    onClick={handleDeleteClick}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 진행 내용 */}
              {selectedDiary.progress && (
                <div className="bg-blue-50 border-l-4 border-blue-400 rounded-md p-4 mb-4">
                  <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      1
                    </span>
                    오늘 진행 내용
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedDiary.progress}
                  </p>
                </div>
              )}

              {/* 트러블슈팅 */}
              {selectedDiary.troubleshooting &&
                (selectedDiary.troubleshooting.problem ||
                  selectedDiary.troubleshooting.solution) && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 rounded-md p-4 mb-4">
                    <h4 className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                        2
                      </span>
                      트러블슈팅
                    </h4>
                    {selectedDiary.troubleshooting.problem && (
                      <p className="text-gray-700 whitespace-pre-wrap mb-2">
                        <span className="font-semibold text-gray-800">
                          문제 상황:
                        </span>{" "}
                        {selectedDiary.troubleshooting.problem}
                      </p>
                    )}
                    {selectedDiary.troubleshooting.solution && (
                      <p className="text-gray-700 whitespace-pre-wrap">
                        <span className="font-semibold text-gray-800">
                          해결 과정:
                        </span>{" "}
                        {selectedDiary.troubleshooting.solution}
                      </p>
                    )}
                  </div>
                )}

              {/* 회고 */}
              {selectedDiary.retrospective && (
                <div className="bg-green-50 border-l-4 border-green-400 rounded-md p-4 mb-4">
                  <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                      3
                    </span>
                    회고
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedDiary.retrospective}
                  </p>
                </div>
              )}

              {/* 닫기 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedDiary(null)}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          )
        )}
      </Modal>
      {/* 삭제 확인 모달 */}
      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
        <div className="text-center p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">일지 삭제</h2>
          <p className="text-gray-600 mb-6">
            정말로 이 일지를 삭제하시겠습니까? <br />
            삭제 후에는 되돌릴 수 없습니다.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-5 py-2 rounded-md hover:bg-red-600 transition"
            >
              삭제
            </button>
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="bg-gray-200 text-gray-700 px-5 py-2 rounded-md hover:bg-gray-300 transition"
            >
              취소
            </button>
          </div>
        </div>
      </Modal>
      {/* Toast 알림 */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type as "success" | "error" | "info"}
          onClose={() => setToast({ message: "", type: "" })}
        />
      )}

    </div>
  );
};

export default Homepage;
