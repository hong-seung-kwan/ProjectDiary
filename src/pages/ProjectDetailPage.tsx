import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, orderBy, query, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Modal from "../components/Modal";

interface Diary {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const ProjectDetailPage = () => {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState("");
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const navigate = useNavigate();

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
          content: doc.data().content || "",
          createdAt: doc.data().createdAt
            ? doc.data().createdAt.toDate().toLocaleDateString()
            : "",
          tags: doc.data().tags || [],
        }));

        setDiaries(list);
      } catch (error) {
        console.error("일지 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndDiaries();
  }, [user, projectId]);

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
            onClick={() => navigate("/diary-write", {state: {projectId, projectName}})}
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
                  <p className="text-gray-700 mb-2 line-clamp-2">{diary.content}</p>

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => setSelectedDiary(diary)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      보기
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
          <div>
            <h3 className="text-xl font-bold mb-2">{selectedDiary.title}</h3>
            <p className="text-sm text-gray-400 mb-4">{selectedDiary.createdAt}</p>
            <p className="whitespace-pre-wrap text-gray-700">{selectedDiary.content}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
