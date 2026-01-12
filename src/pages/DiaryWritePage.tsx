import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Lightbulb, Tag } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}
interface Troubleshooting {
  problem: string;
  solution: string;
}


const DiaryWritePage = () => {

  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectProject, setSelectProject] = useState("");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState("");
  const [troubleshooting, setTroubleshooting] = useState<Troubleshooting>({
    problem: "",
    solution: "",
  });
  const [retrospective, setRetrospective] = useState("");
  const [tags, setTags] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();

  const editDiary = location.state?.editDiary || null;
  const isEditMode = !!editDiary;

  // 수정 모드 값 세팅
  useEffect(() => {
    if (isEditMode && editDiary) {
      setSelectProject(editDiary.projectId);
      setTitle(editDiary.title || '');
      setProgress(editDiary.progress || '');
      setTroubleshooting(editDiary.troubleshooting || { problem: '', solution: '' });
      setRetrospective(editDiary.retrospective || '');
      setTags(editDiary.tags || []);

      if (editDiary.projectId) {
        setSelectProject(editDiary.projectId);
      }
    }
  }, [isEditMode, editDiary]);

  // projectDetail에서 일지 추가 버튼으로 넘어왔을 경우 프로젝트 자동으로 선택
  useEffect(() => {
    if (location.state?.projectId) {
      setSelectProject(location.state.projectId);
    }
  }, [location.state]);

  // 사용자 프로젝트 불러오기
  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        const projectRef = collection(db, "users", user.uid, "projects");
        const snapshot = await getDocs(projectRef);
        const projectList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "제목없음",
        }));
        setProjects(projectList);

        if (isEditMode && editDiary?.projectId){
          const targetProject = 
            projectList.find((p) => p.id === editDiary.projectId) ||
            projectList.find((p) => p.name === editDiary.projectId);

            if (targetProject) {
              setSelectProject(targetProject.id);
            }
        }
      } catch (error) {
        console.log("프로젝트 목록 불러오기 실패:", error);
      }
    };

    fetchProjects();
  }, [user, isEditMode, editDiary])

  // 일지 추가
  const handleSubmit = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    if (!selectProject) return alert("프로젝트를 선택해주세요!");
    if (!title.trim()) return alert("일지 제목을 입력해주세요!");
    if (!progress.trim()) return alert("오늘 진행 내용을 입력해주세요!");

    try {
      const tagsArray: string[] = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      if (isEditMode) {
        // 수정 모드
        const diaryRef = doc(
          db,
          "users",
          user.uid,
          "projects",
          selectProject,
          "diaries",
          editDiary.id
        );
        await updateDoc(diaryRef, {
          title,
          progress,
          troubleshooting,
          retrospective,
          tags: tagsArray,
        });
        alert("일지가 수정되었습니다!");
      } else {
        // 새 일지 작성
        const diaryRef = collection(
          db,
          "users",
          user.uid,
          "projects",
          selectProject,
          "diaries"
        );

        const today = new Date().toLocaleDateString();
        const snapshot = await getDocs(diaryRef);
        const todayDiary = snapshot.docs.find((doc) => {
          const data = doc.data();
          if (!data.createdAt) return false;
          const created = data.createdAt.toDate().toLocaleDateString();
          return created === today;
        });

        if (todayDiary) {
          const confirmMove = confirm(
            "오늘은 이미 일지를 작성했습니다. 해당 프로젝트로 이동하시겠습니까?"
          );
          if (confirmMove) navigate(`/project/${selectProject}`);
          return;
        }

        await addDoc(diaryRef, {
          title,
          progress,
          troubleshooting,
          retrospective,
          tags: tagsArray,
          createdAt: serverTimestamp(),
        });
        alert("일지가 추가되었습니다!");
      }

      navigate(`/project/${selectProject}`);
    } catch (error) {
      console.error("일지 저장 실패:", error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">
        프로젝트 일지 {isEditMode ? "수정" : "작성"}
      </h1>
      <p className="text-gray-500 mb-8">
        오늘의 프로젝트 진행 상황을 기록하세요.
      </p>

      {/* 작성 가이드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="flex items-start gap-3 p-4 border rounded-xl bg-green-50 border-green-100">
          <Lightbulb className="text-green-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-700">구체적으로 작성</h3>
            <p className="text-xs text-green-600">
              무엇을 했는지, 왜 했는지, 결과가 무엇인지 명확히 작성하세요.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 border rounded-xl bg-blue-50 border-blue-100">
          <Tag className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-700">태그 활용</h3>
            <p className="text-xs text-blue-600">
              버그 수정, 기능 추가, 리팩토링 등으로 분류하세요.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 border rounded-xl bg-green-50 border-green-100">
          <Clock className="text-green-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-700">매일 기록</h3>
            <p className="text-xs text-green-600">
              꾸준한 기록이 성장의 기반이 됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        {/* 프로젝트 선택 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            프로젝트 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectProject}
            onChange={(e) => setSelectProject(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="">프로젝트 선택</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            일지 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="오늘의 작업 요약 제목을 입력하세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* 진행 내용 */}
        <div className="p-4 border-2 border-green-100 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-700 mb-2">
            1️⃣ 오늘 진행 내용 <span className="text-red-500">*</span>
          </h3>
          <textarea
            placeholder="오늘 진행한 작업 내용을 구체적으로 작성하세요."
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 text-sm focus:ring-2 focus:ring-green-300 outline-none"
          />
        </div>

        {/* 트러블슈팅 */}
        <div className="p-4 border-2 border-orange-100 bg-orange-50 rounded-lg">
          <h3 className="font-semibold text-orange-700 mb-2">2️⃣ 트러블슈팅 (선택)</h3>
          <textarea
            placeholder="문제 상황을 작성하세요."
            value={troubleshooting.problem}
            onChange={(e) =>
              setTroubleshooting({ ...troubleshooting, problem: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 text-sm mb-3"
          />
          <textarea
            placeholder="해결 과정을 작성하세요."
            value={troubleshooting.solution}
            onChange={(e) =>
              setTroubleshooting({ ...troubleshooting, solution: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 text-sm"
          />
        </div>

        {/* 회고 */}
        <div className="p-4 border-2 border-blue-100 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-700 mb-2">3️⃣ 회고 (선택)</h3>
          <textarea
            placeholder="오늘 배운 점, 개선할 점, 내일의 다짐 등을 작성하세요."
            value={retrospective}
            onChange={(e) => setRetrospective(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
          />
        </div>

        {/* 태그 */}
        <div>
            <label className='block text-sm font-semibold text-gray-700 mb-1'>
              태그 (쉼표로 구분)
            </label>
            <input
              type='text'
              placeholder='예: 버그 수정, 기능 추가, 리팩토링'
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none'
            />
            <p className='text-sm text-gray-500 mt-1'>
              여러 개를 입력하려면 쉼표( , )로 구분하세요!
            </p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 transition shadow-sm"
          >
            {isEditMode ? "수정 저장" : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiaryWritePage