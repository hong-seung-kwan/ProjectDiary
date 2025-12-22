import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Modal from "../components/Modal";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Pencil, Search, Trash2, X } from "lucide-react";
import Toast from "../components/Toast";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  diaryCount?: number;
}

const ProjectManagePage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editData, setEditData] = useState({ name: "", description: "", status: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectCounts, setProjectCounts] = useState({
    total: 0,
    plan: 0,
    ongoing: 0,
    done: 0,
  })

  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("recent");
  const [showSearch, setShowSearch] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "" }>({
    message: "",
    type: "",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // 프로젝트 불러오기
  useEffect(() => {
    if (!user) return;

    const userProjectsRef = collection(db, "users", user.uid, "projects");

    // onSnapshot으로 실시간 리스너 등록
    const unsubscribe = onSnapshot(userProjectsRef, async (snapshot) => {
      const projectList: Project[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const projectId = docSnap.id;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...projectData } = docSnap.data() as Project;

          // diaries 개수 실시간 반영
          const diariesRef = collection(db, "users", user.uid, "projects", projectId, "diaries");
          const diariesSnap = await getDocs(diariesRef);
          const diaryCount = diariesSnap.size;

          return {
            id: projectId,
            ...projectData,
            diaryCount,
          };
        })
      );

      // 프로젝트 상태 카운트
      const counts = { total: 0, plan: 0, ongoing: 0, done: 0 };
      projectList.forEach((p) => {
        counts.total++;
        if (p.status === "계획중") counts.plan++;
        else if (p.status === "진행중") counts.ongoing++;
        else if (p.status === "완료") counts.done++;
      });

      setProjects(projectList);
      setFilteredProjects(projectList);
      setProjectCounts(counts);
      setLoading(false);
    });

    // 🔹 cleanup: 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [user]);


  // 검색, 필터, 정렬
  useEffect(() => {
    let result = [...projects];

    if (activeFilter !== "전체") {
      result = result.filter((p) => p.status === activeFilter);
    }

    if (searchTerm.trim() !== "") {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOption === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "oldest") {
      result.sort((a, b) => (a.id > b.id ? 1 : -1));
    } else if (sortOption === "recent") {
      result.sort((a, b) => (a.id < b.id ? 1 : -1));
    }

    setFilteredProjects(result)

  }, [activeFilter, searchTerm, sortOption, projects]);

  // 삭제
  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "projects", id));
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showToast("프로젝트가 삭제되었습니다.","success");
    } catch (error) {
      console.error("프로젝트 삭제 실패:", error);
    }
  };

  // 수정 모드
  const handleEditOpen = (project: Project) => {
    setSelectedProject(project);
    setEditData({
      name: project.name,
      description: project.description,
      status: project.status,
    });
    setIsModalOpen(true);
  };

  // 수정 저장하기
  const handleSave = async () => {
    if (!user || !selectedProject) return;
    try {
      const projectRef = doc(db, "users", user.uid, "projects", selectedProject.id);
      await updateDoc(projectRef, editData);

      setProjects((prev) =>
        prev.map((p) =>
          p.id === selectedProject.id
            ? { ...p, description: editData.description, status: editData.status }
            : p
        )
      );
      setIsModalOpen(false);
      showToast("프로젝트가 수정되었습니다!","success");
    } catch (error) {
      console.error("수정 실패:", error);
    }
  };

  if (loading) return <p className="text-center mt-10">로딩 중...</p>;
  if (!user) return <p className="text-center mt-10">로그인 후 이용해주세요.</p>;

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold mb-1">프로젝트 관리</h2>
      <p className="text-gray-500 mb-4">모든 프로젝트를 한 곳에서 관리하세요</p>

      {/* 상태 카드 */}
      <div className="grid grid-cols-4 gap-5 mb-10">
        <div className="bg-white p-5 rounded-xl shadow-sm text-center border border-gray-200">
          <p className="text-gray-600 text-sm">전체</p>
          <h2 className="text-3xl font-bold">
            {projectCounts.total}
          </h2>
        </div>
        <div className="bg-blue-50 p-5 rounded-xl shadow-sm text-center border border-blue-100">
          <p className="text-gray-600 text-sm">계획중</p>
          <h2 className="text-3xl font-bold text-blue-600">
            {projectCounts.plan}
          </h2>
        </div>
        <div className="bg-green-50 p-5 rounded-xl shadow-sm text-center border border-green-100">
          <p className="text-gray-600 text-sm">진행중</p>
          <h2 className="text-3xl font-bold text-green-600">
            {projectCounts.ongoing}
          </h2>
        </div>
        <div className="bg-gray-100 p-5 rounded-xl shadow-sm text-center border border-gray-200">
          <p className="text-gray-600 text-sm">완료</p>
          <h2 className="text-3xl font-bold text-gray-600">
            {projectCounts.done}
          </h2>
        </div>
      </div>

      {/* 필터 부분 */}
      <div className="flex gap-3 mb-6">
        {["전체", "계획중", "진행중", "완료"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-5 py-2 rounded-full border transition-all font-medium ${activeFilter === tab
              ? "bg-blue-500 text-white border-blue-500 shadow-sm"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* 검색 , 정렬 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            title="검색"
            onClick={() => setShowSearch(!showSearch)}
            className="text-gray-500 hover:text-blue-500 p-2 transition"
          >
            {showSearch ? <X size={20} /> : <Search size={20} />}
          </button>

          <div
            className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${showSearch ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
          >
            <input
              type="text"
              placeholder="프로젝트 이름 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
        </div>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          <option value="recent">최근 추가순</option>
          <option value="oldest">오래된순</option>
          <option value="az">이름순</option>
        </select>
      </div>
      {/* 프로젝트 목록 */}
      {filteredProjects.length === 0 ? (
        <p className="text-center text-gray-500">
          해당 상태의 프로젝트가 없습니다.
        </p>
      ) : (
        <ul className="space-y-4">
          {filteredProjects.map((p) => (
            <li
              key={p.id}
              className="p-5 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{p.name}</h3>
                <p className="text-sm text-gray-600">{p.description}</p>
                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${p.status === "진행중"
                    ? "bg-green-100 text-green-700"
                    : p.status === "완료"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-purple-200 text-blue-700"
                    }`}
                >
                  {p.status}
                </span>
                <span className="ml-3 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
                  일지: {p.diaryCount ?? 0}개
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleEditOpen(p)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => navigate(`/project/${p.id}`)}
                  className="text-gray-400 hover:text-blue-500"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 수정 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4 pb-2 text-gray-800">프로젝트 수정</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 이름</label>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="프로젝트 이름 수정..."
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 설명</label>
          <textarea
            value={editData.description}
            onChange={(e) =>
              setEditData({ ...editData, description: e.target.value })
            }
            className="w-full border border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
            placeholder="설명 수정..."
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select
            value={editData.status}
            onChange={(e) =>
              setEditData({ ...editData, status: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option>계획중</option>
            <option>진행중</option>
            <option>완료</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm"
          >
            저장
          </button>
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

export default ProjectManagePage;
