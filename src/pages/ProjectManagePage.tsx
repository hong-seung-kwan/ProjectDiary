import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import Modal from "../components/Modal";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

const ProjectManagePage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editData, setEditData] = useState({ description: "", status: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectCounts, setProjectCounts] = useState({
    plan: 0,
    ongoing: 0,
    done: 0,
  })

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const userProjectsRef = collection(db, "users", user.uid, "projects");
        const snapshot = await getDocs(userProjectsRef);
        const projectList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];

        const counts = {plan: 0, ongoing: 0, done: 0};
        projectList.forEach((p) => {
          if (p.status === "계획중") counts.plan++;
          else if (p.status === "진행중") counts.ongoing++;
          else if (p.status === "완료") counts.done++;
        });

        setProjects(projectList);
        setProjectCounts(counts);
      } catch (error) {
        console.error("프로젝트 목록 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "projects", id));
      setProjects((prev) => prev.filter((p) => p.id !== id));
      alert("프로젝트가 삭제되었습니다.");
    } catch (error) {
      console.error("프로젝트 삭제 실패:", error);
    }
  };

  const handleEditOpen = (project: Project) => {
    setSelectedProject(project);
    setEditData({
      description: project.description,
      status: project.status,
    });
    setIsModalOpen(true);
  };

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
      alert("프로젝트가 수정되었습니다!");
    } catch (error) {
      console.error("수정 실패:", error);
    }
  };

  if (loading) return <p className="text-center mt-10">로딩 중...</p>;
  if (!user) return <p className="text-center mt-10">로그인 후 이용해주세요.</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">내 프로젝트 목록</h2>

      {/* 상태 카드 부분 */}
      <div className="flex justify-between gap-3 mb-6">
        <div className="flex-1 text-center bg-blue-50 p-4 rounded-lg mx-2">
          <p className="text-gray-600">계획중</p>
          <p className="text-2xl font-bold text-blue-600">{projectCounts.plan}</p>
        </div>
        <div className="flex-1 text-center bg-green-50 p-4 rounded-lg mx-2">
          <p className="text-gray-600">진행중</p>
          <p className="text-2xl font-bold text-green-600">{projectCounts.ongoing}</p>
        </div>
        <div className="flex-1 text-center bg-gray-100 p-4 rounded-lg mx-2">
          <p className="text-gray-600">완료</p>
          <p className="text-2xl font-bold text-gray-600">{projectCounts.done}</p>
        </div>
      </div>

      {/* 프로젝트 카드 부분 */}
      {projects.length === 0 ? (
        <p className="text-center text-gray-500">등록된 프로젝트가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-sm text-gray-600">{p.description}</p>
                <p className="text-xs text-gray-400 mt-1">{p.status}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => handleEditOpen(p)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  🗑 삭제
                </button>
                <button
                  onClick={() => navigate(`/project/${p.id}`)}
                  className="text-gray-500 hover:text-blue-500 text-xl font-bold"
                >
                  &gt;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/*수정 모달 */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4">프로젝트 수정</h2>
        <textarea
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="w-full border rounded-md px-3 py-2 mb-3"
          placeholder="설명 수정..."
        />
        <select
          value={editData.status}
          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
          className="w-full border rounded-md px-3 py-2 mb-4"
        >
          <option>계획중</option>
          <option>진행중</option>
          <option>완료</option>
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            저장
          </button>
          <button
            onClick={() => setIsModalOpen(false)}
            className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectManagePage;
