import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useLocation, useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
}


const DiaryWritePage = () => {

  const {user} = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectProject, setSelectProject] = useState("");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState("");
  const [troubleshooting, setTroubleshooting] = useState("");
  const [retrospective, setRetrospective] = useState("");
  const [step, setStep] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();


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
      } catch (error) {
        console.log("프로젝트 목록 불러오기 실패:", error);
      }
    };
    
    fetchProjects();
  }, [user])

  // 일지 추가
  const handleSubmit = async () => {
    if(!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if(!selectProject){
      alert("프로젝트를 선택해주세요!!")
      return;
    }

    try {
      const diaryRef = collection(db, "users", user.uid, "projects", selectProject, "diaries");
      await addDoc(diaryRef, {
        title,
        progress,
        troubleshooting,
        retrospective,
        createdAt: serverTimestamp(),
      })
      alert("일지가 추가되었습니다.");
      setTitle("");
      setProgress("");
      setTroubleshooting("");
      setRetrospective("");
      setStep(1);
      navigate(`/project/${selectProject}`);
    } catch (error) {
      console.error("일지 추가 실패: ", error);
      alert("오류가 발생했습니다.")
    }
  }

  const stepTitle = ["프로젝트 선택 및 제목", "오늘 진행 내용", "트러블슈팅", "회고"]
  return (
    <div className='max-w-lg mx-auto mt-10 bg-white p-6 rounded-xl shadow'>
      <h2 className='text-2xl font-bold mb-4 text-center'>
        Step {step} - {stepTitle[step -1]}
      </h2>
      
      {/* step 1 : 프로젝트 선택 제목 */}
      {step === 1 && (
        <>
          <select
            value={selectProject}
            onChange={(e) => setSelectProject(e.target.value)}
            required
            className='w-full border rounded-md px-3 py-2 mb-4'
          >
            <option value="">프로젝트 선택</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                  {proj.name}
              </option>
            ))}
          </select>

          <input
            type='text'
            placeholder='일지 제목 입력'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className='w-full border rounded-md px-3 py-2'
          />
        </>
      )}

      {/* step 2: 오늘 진행 내용 */}
      {step === 2 && (
        <textarea
          placeholder='오늘 진행한 내용을 입력하세요!'
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          className='w-full border rounded-md px-3 py-2 h-40'
        />
      )}

      {/* step 3: 트러블 슈팅 */}
      {step === 3 && (
        <textarea
          placeholder='문제 상황과 해결 과정 작성'
          value={troubleshooting}
          onChange={(e) => setTroubleshooting(e.target.value)}
          className='w-full border rounded-md px-3 py-2 h-40'
        />
      )}

      {/* step 4: 회고 */}
      {step === 4 && (
        <textarea
          placeholder='회고작성란'
          value={retrospective}
          onChange={(e) => setRetrospective(e.target.value)}
          className='w-full border rounded-md px-3 py-2 h-40'
        />
      )}

      <div className='flex justify-between mt-6'>
        {step > 1 && (
          <button
            onClick={() => setStep(step -1)}
            className='bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300'
          >
            이전
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => setStep(step +1)}
            className='ml-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className='ml-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600'
          >
            저장
          </button>
        )}
      </div>
      
      <div className='flex justify-center mt-6 space-x-2'>
        {[1, 2, 3, 4].map((num) => (
          <div
            key={num}
            className={`w-3 h-3 rounded-full ${
              step === num ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
          </div>
        ))}
      </div>
    </div>
  )
}

export default DiaryWritePage