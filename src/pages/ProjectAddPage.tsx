import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { FolderPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
}

const ProjectAddPage = () => {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("계획중");
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "" }>({
    message: "",
    type: "",
  })
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  }
  const navigate = useNavigate();

  // 프로젝트 등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }

    try {
      const userProjectsRef = collection(db, "users", user.uid, "projects");
      await addDoc(userProjectsRef, {
        name: projectName,
        description,
        status,
        createdAt: serverTimestamp(),
      });

      showToast("프로젝트가 성공적으로 추가되었습니다!","success");
      setTimeout(() => navigate("/project-manage"), 1000);
    } catch (error) {
      console.error("프로젝트 추가 실패:", error);
      showToast("❌ 에러가 발생했습니다.","error");
    }
  };

  // 최근 추가된 프로젝트 불러오기
  const fetchRecentProjects = async () => {
    if (!user) return;
    const userProjectsRef = collection(db, "users", user.uid, "projects");
    const q = query(userProjectsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const projects: Project[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      status: doc.data().status,
      createdAt: doc.data().createdAt
        ? doc.data().createdAt.toDate().toLocaleDateString()
        : "",
    }));

    setRecentProjects(projects.slice(0, 5));
  };

  useEffect(() => {
    fetchRecentProjects();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-4">
      {/* 상단 카드형 폼 */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl shadow-lg p-10 w-full max-w-2xl">
        <div className="flex flex-col items-center mb-6">
          <FolderPlus className="text-blue-500 mb-3" size={56} />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            프로젝트 추가
          </h2>
          <p className="text-gray-500 text-center text-sm">
            진행 중이거나 계획 중인 프로젝트를 등록해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 섹션 타이틀 */}
          <div>

            {/* 프로젝트 이름 */}
            <label className="block text-sm font-medium text-foreground mb-1">
              프로젝트 이름
            </label>
            <input
              type="text"
              placeholder="예: 웹사이트 리디자인"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />

            {/* 프로젝트 설명 */}
            <label className="block text-sm font-medium mt-5 mb-1">
              프로젝트 설명
            </label>
            <textarea
              placeholder="프로젝트에 대한 상세 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 h-28 text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />

            {/* 프로젝트 상태 */}
            <label className="block text-sm font-medium text-gray-700 mt-5 mb-1">
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option>계획중</option>
              <option>진행중</option>
              <option>완료</option>
            </select>
          </div>

          {/* 제출 버튼 */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium"
            >
              프로젝트 추가
            </button>
          </div>
        </form>

      </div>

      {/* 최근 등록 프로젝트 리스트 */}
      <div className="mt-12 w-full max-w-2xl bg-white/80 border border-gray-100 rounded-2xl shadow-sm p-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          최근 등록된 프로젝트
        </h3>

        {recentProjects.length === 0 ? (
          <p className="text-gray-500 text-center">
            등록된 프로젝트가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentProjects.map((p) => (
              <li
                key={p.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <p className="font-medium text-gray-800 text-lg">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {p.status} | {p.createdAt}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
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

export default ProjectAddPage;
