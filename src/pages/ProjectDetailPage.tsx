import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, orderBy, query, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Modal from "../components/Modal";

interface Troubleshooting {
  problem?: string;
  solution?: string;
}

interface Diary {
  id: string;
  title: string;
  progress: string;
  troubleshooting?: Troubleshooting;
  retrospective?: string;
  createdAt: string;
  tags?: string[];
}

const ProjectDetailPage = () => {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState("");
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProjectAndDiaries = async () => {
      if (!user || !projectId) return;
      // 프로젝트 정보 불러오가
      try {
        const projectRef = doc(db, "users", user.uid, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          setProjectName(projectSnap.data().name);
        }

        // 일지 리스트 불러오기
        const ref = collection(db, "users", user.uid, "projects", projectId, "diaries");
        const q = query(ref, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || "(제목 없음)",
          progress: doc.data().progress || "",
          troubleshooting: doc.data().troubleshooting || { problem: "", solution: "" },
          retrospective: doc.data().retrospective || "",
          tags: doc.data().tags || [],
          createdAt: doc.data().createdAt
            ? doc.data().createdAt.toDate().toLocaleDateString()
            : "",
        }));
        setDiaries(list);

        // 홈에서 일지를 클릭한 경우
        if (location.state?.openDiaryId && !selectedDiary) {
          const targetDiary = list.find((d) => d.id === location.state.openDiaryId);
          if (targetDiary) {
            setSelectedDiary(targetDiary);
            navigate(location.pathname, { replace: true });
          }
        }
      } catch (error) {
        console.error("일지 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndDiaries();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId, location.state]);

  // 일지 삭제
  const handleDeleteDiary = async (id: string) => {
    if (!user || !projectId) return;
    if (!confirm("정말로 이 일지를 삭제하시겠습니까?")) return;

    try {
      const diaryRef = doc(db, "users", user.uid, "projects", projectId, "diaries", id);
      await deleteDoc(diaryRef);

      // 로컬 상태에서 즉시 제거
      setDiaries((prev) => prev.filter((d) => d.id !== id));

      alert("🗑️ 일지가 삭제되었습니다!");
    } catch (error) {
      console.error("일지 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };


  const handleNewDiaryClick = async () => {
    if (!user || !projectId) return;

    try {
      const diaryRef = collection(db, "users", user.uid, "projects", projectId, "diaries");
      const snapshot = await getDocs(diaryRef);

      const today = new Date().toLocaleDateString();
      const todayDiaryDoc = snapshot.docs.find((doc) => {
        const data = doc.data();
        if (!data.createdAt) return false;
        const createdAt = data.createdAt.toDate().toLocaleDateString();
        return createdAt === today;
      });

      if (todayDiaryDoc) {
        // 오늘 일지 이미 있으면 수정 페이지로 이동
        const todayDiary = {
          id: todayDiaryDoc.id,
          ...todayDiaryDoc.data(),
        };
        const confirmEdit = confirm("오늘 일지는 이미 작성되었습니다.\n수정 페이지로 이동하시겠습니까?");
        if (confirmEdit) {
          navigate("/diary-write", { state: { editDiary: todayDiary, projectId, projectName } });
        }
        return;
      }

      // 없으면 작성 페이지로 이동
      navigate("/diary-write", { state: { projectId, projectName } });
    } catch (error) {
      console.error("일지 확인 중 오류:", error);
      alert("일지를 불러오는 중 문제가 발생했습니다.");
    }
  };

  if (loading) return <p className="text-center mt-10">불러오는 중...</p>;
  if (!user) return <p className="text-center mt-10">로그인 후 이용해주세요.</p>;

  return (
    <div className="max-w-4xl mt-3">
      {/* 상단 프로젝트 정보*/}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="top-3 hover:text-blue-600 text-sm mb-2"
        >
          ← 돌아가기
        </button>

        <h1 className="text-3xl font-bold mb-2">{projectName}</h1>
        <p className="text-gray-500 mb-6">총 {diaries.length}개의 일지</p>

        <button
          onClick={handleNewDiaryClick}
          className="bg-blue-400 text-white px-5 py-2 rounded-md hover:gb-blue-600 mb-4 transition"
        >
          + 새 일지 작성
        </button>
      </div>

      {/*타임라인 영역 */}
      <div className="bg-white p-8 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-6">프로젝트 일지 타임라인</h2>

        {diaries.length === 0 ? (
          <p className="text-center text-gray-500">아직 작성된 일지가 없습니다.</p>
        ) : (
          <div className="relative border-l-4 border-blue-200 ml-4 pl-6 space-y-8">
            {diaries.map((diary) => (
              <div key={diary.id} className="relative">
                {/*타임라인 동그라미 */}
                <div className="absolute -left-[33px] top-2 w-5 h-5 bg-blue-500 rounded-full border-4 border-white"></div>


                <div className="bg-gray-50 border rounded-lg p-5 shadow-sm hover:shadow-md transition">
                  <h3 className="text-lg font-semibold">{diary.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{diary.createdAt}</p>
                  <p className="text-gray-700 mb-2 line-clamp-2">{diary.progress}</p>

                  <div className="flex justify-end mt-3 space-x-3">
                    <button
                      onClick={() => setSelectedDiary(diary)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      보기
                    </button>
                    <button
                      onClick={() => navigate("/diary-write", {
                        state: {
                          editDiary: diary,
                          projectId,
                          projectName,
                        }
                      })}
                      className="text-green-500 hover:text-green-700 text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteDiary(diary.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 모달 */}
      <Modal isOpen={!!selectedDiary} onClose={() => setSelectedDiary(null)}>
        {selectedDiary && (
          <div className="transition-all duration-300 ease-in-out">
            <h3 className="text-2xl font-bold mb-1">{selectedDiary.title}</h3>
            <p className="text-sm text-gray-400 mb-5">{selectedDiary.createdAt}</p>

            {selectedDiary.tags && selectedDiary.tags.length > 0 && (
              <div>
                {selectedDiary.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {selectedDiary.progress && (
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-md p-4 mb-4">
                <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">1</span>
                  오늘 진행 내용
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedDiary.progress}
                </p>
              </div>
            )}

            {selectedDiary.troubleshooting &&
              (selectedDiary.troubleshooting?.problem || selectedDiary.troubleshooting?.solution) && (
                <div className="bg-orange-50 border-l-4 border-orange-400 rounded-md p-4 mb-4">
                  <h4 className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">2</span>
                    트러블슈팅
                  </h4>
                  {selectedDiary.troubleshooting?.problem && (
                    <p className="text-gray-700 whitespace-pre-wrap mb-2">
                      <span className="font-semibold text-gray-800">문제 상황: </span>
                      {selectedDiary.troubleshooting.problem}
                    </p>
                  )}
                  {selectedDiary.troubleshooting?.solution && (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      <span className="font-semibold text-gray-800">해결 과정: </span>
                      {selectedDiary.troubleshooting.solution}
                    </p>
                  )}
                </div>
              )}

            {/* 회고 */}
            {selectedDiary.retrospective && (
              <div className="bg-green-50 border-l-4 border-green-400 rounded-md p-4 mb-4">
                <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">3</span>
                  회고
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedDiary.retrospective}
                </p>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedDiary(null)}
                className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
