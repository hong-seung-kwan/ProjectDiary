import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const ProjectAddPage = () => {
  
  const {user} = useAuth();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('계획중');

  console.log("현재 로그인:", user)

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      return;
    }

    try {
      const userProjectsRef = collection(db, 'users', user.uid, 'projects');
      await addDoc(userProjectsRef, {
        name: projectName,
        description,
        status,
        createdAt: serverTimestamp(),
      });
      alert('프로젝트가 추가되었습니다!!');
      setProjectName('');
      setDescription('');
      setStatus('계획중');
    } catch(error) {
      console.error('프로젝트 추가 실패:', error);
      alert('에러가 발생했습니다.');
    }
  };

  return (
    <div className='max-w-lg mx-auto mt-10 bg-white p-6 rounded-xl shadow'>
      <h2 className='text-2xl font-bold mb-4'>프로젝트 추가</h2>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <input
          type='text'
          placeholder='프로젝트 이름'
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          className='w-full border rounded-md px-3 py-2'
        />
        <textarea
          placeholder='프로젝트 설명'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='w-full border rounded-md px-3 py-2'
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className='w-full border rounded-md px-3 py-2'
        >
          <option>계획중</option>
          <option>진행중</option>
          <option>완료</option>
        </select>
        <button
          type='submit'
          className='w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600'
        >
          프로젝트 추가
        </button>
      </form>
    </div>
  )
}

export default ProjectAddPage