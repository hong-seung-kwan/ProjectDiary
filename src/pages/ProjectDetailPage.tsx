import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, orderBy, query, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
}

const ProjectDetailPage = () => {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState("");
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    progress: "",
    problem: "",
    solution: "",
    retrospective: "",
  })
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
          createdAt: doc.data().createdAt
            ? doc.data().createdAt.toDate().toLocaleDateString()
            : "",
        }));
        setDiaries(list);

        
        const today = new Date().toLocaleDateString();
        // 홈에서 일지를 클릭한 경우
        if (location.state?.openDiaryId && !selectedDiary) {
          const targetDiary = list.find((d) => d.id === location.state.openDiaryId);
          if (targetDiary) {
            setSelectedDiary(targetDiary);
            navigate(location.pathname, { replace: true });
          }
        }

        // 오늘 작성한 일지가 있으면 수정페이지로
        else if (location.state?.openToday && !selectedDiary) {
          const todayDiary = list.find((d) => d.createdAt === today);
          if (todayDiary) {
            setEditingDiary(todayDiary);
            setEditForm({
              title: todayDiary.title,
              progress: todayDiary.progress,
              problem: todayDiary.troubleshooting?.problem || "",
              solution: todayDiary.troubleshooting?.solution || "",
              retrospective: todayDiary.retrospective || "",
            });
            navigate(location.pathname, { replace: true }); // 무한 실행 방지
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

  // 일지 수정
  const handleEditOpen = (diary: Diary) => {
    setEditingDiary(diary);
    setEditForm({
      title: diary.title,
      progress: diary.progress,
      problem: diary.troubleshooting?.problem || "",
      solution: diary.troubleshooting?.solution || "",
      retrospective: diary.retrospective || "",
    })
  }

  // 수정한 내용 저장
  const handleEditSave = async () => {
    if (!user || !projectId || !editingDiary) return;

    // 1. Firestore 업데이트
    const diaryRef = doc(db, "users", user.uid, "projects", projectId, "diaries", editingDiary.id);
    const updatedDiary = {
      title: editForm.title,
      progress: editForm.progress,
      troubleshooting: {
        problem: editForm.problem,
        solution: editForm.solution,
      },
      retrospective: editForm.retrospective,
    };

    try {
      await updateDoc(diaryRef, updatedDiary);

      // 2. 로컬 상태 즉시 반영
      setDiaries((prev) =>
        prev.map((d) =>
          d.id === editingDiary.id ? { ...d, ...updatedDiary } : d
        )
      );

      // 3. 편집 모달 닫기
      setEditingDiary(null);


      alert("일지가 수정되었습니다!");
    } catch (error) {
      console.error("일지 수정 실패:", error);
      alert("수정 실패했습니다");
    }
  };


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
      const todayDiary = snapshot.docs.find((doc) => {
        const data = doc.data();
        if (!data.createdAt) return false;
        const createdAt = data.createdAt.toDate().toLocaleDateString();
        return createdAt === today;
      });

      if (todayDiary) {
        const confirmEdit = confirm("오늘 일지는 이미 작성되었습니다. \n수정 페이지로 이동하시겠습니까??")
        if (confirmEdit) {
          navigate(`/project/${projectId}`, {
            state: { openToday: true },
          })
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
                      onClick={() => handleEditOpen(diary)}
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
            <h3 className="text-xl font-bold mb-2">{selectedDiary.title}</h3>
            <p className="text-sm text-gray-400 mb-4">{selectedDiary.createdAt}</p>

            {selectedDiary.progress && (
              <>
                <h4 className="font-semibold text-blue-600 mt-2 mb-1">오늘 진행 내용</h4>
                <p className="whitespce-pre-wrap text-gray-700 mb-3">
                  {selectedDiary.progress}
                </p>
              </>
            )}

            {selectedDiary.troubleshooting &&
              (selectedDiary.troubleshooting.problem || selectedDiary.troubleshooting.solution) && (
                <>
                  <h4 className="font-semibold text-orange-500 mt-2 mb-1">트러블슈팅</h4>

                  {selectedDiary.troubleshooting.problem && (
                    <>
                      <p className="font-semibold text-gray-700 mt-2">문제 상황</p>
                      <p className="whitespace-pre-wrap mb-2">
                        {selectedDiary.troubleshooting.problem}
                      </p>
                    </>
                  )}

                  {selectedDiary.troubleshooting.solution && (
                    <>
                      <p className="font-semibold text-gray-700 mt-2">해결 과정</p>
                      <p className="whitespace-pre-wrap mb-2">
                        {selectedDiary.troubleshooting.solution}
                      </p>
                    </>
                  )}
                </>
              )}


            {selectedDiary.retrospective && selectedDiary.retrospective.trim() !== "" && (
              <>
                <h4 className="font-semibold text-green-600 mt-2 mb-1">회고</h4>
                <p className="whitespace-pre-wrap text-gray-700">
                  {selectedDiary.retrospective}
                </p>
              </>
            )}


          </div>
        )}
      </Modal>

      {/* 수정 모달 */}
      <Modal isOpen={!!editingDiary} onClose={() => setEditingDiary(null)}>
        {editingDiary && (
          <div className="transition-all duration-300 ease-in-out">
            <h3 className="text-xl font-bold mb-4">일지 수정</h3>

            <h4 className="font-semibold mt-2 mb-1">제목</h4>
            <input
              type="text"
              placeholder="제목"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <h4 className="font-semibold text-blue-600 mt-2 mb-1">오늘 진행 내용</h4>
            <textarea
              placeholder="오늘 진행 내용"
              value={editForm.progress}
              onChange={(e) => setEditForm({ ...editForm, progress: e.target.value })}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <h4 className="font-semibold text-orange-500 mt-2 mb-1">트러블슈팅</h4>

            <h5 className="font-semibold text-orange-500 mt-2 mb-1">문제 상황</h5>
            <textarea
              placeholder="문제 상황"
              value={editForm.problem}
              onChange={(e) => setEditForm({ ...editForm, problem: e.target.value })}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <h5 className="font-semibold text-orange-500 mt-2 mb-1">해결 과정</h5>
            <textarea
              placeholder="해결 과정"
              value={editForm.solution}
              onChange={(e) => setEditForm({ ...editForm, solution: e.target.value })}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <h4 className="font-semibold text-green-500 mt-2 mb-1">회고</h4>
            <textarea
              placeholder="회고"
              value={editForm.retrospective}
              onChange={(e) => setEditForm({ ...editForm, retrospective: e.target.value })}
              className="w-full border rounded-md px-3 py-2 mb-3"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingDiary(null)}
                className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleEditSave}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </div>
        )}

      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
