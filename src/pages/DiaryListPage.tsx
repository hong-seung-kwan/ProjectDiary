import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebase';

interface Project {
    id: string;
    name: string;
}
interface Diary {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}


const DiaryListPage = () => {

    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        if (!user) return;
        const fetchProjects = async () => {
            const ref = collection(db, "users", user.uid, "projects");
            const snapshot = await getDocs(ref);
            const list = snapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name || "제목없음",
            }))
            setProjects(list);
        }

        fetchProjects();
    }, [user])

    const fetchDiaries = async (projectId: string) => {
        if (!user || !projectId) return;
        setLoading(true);
        try {
            const diariesRef = collection(db, "users", user.uid, "projects", projectId, "diaries");
            const q = query(diariesRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const list = snapshot.docs.map((doc) => ({
                id: doc.id,
                title: doc.data().title || "제목없음",
                content: doc.data().content || "",
                createdAt: doc.data().createdAt?.toDate().toLocaleString() || "-",
            }));
            setDiaries(list);
        } catch (error) {
            console.error("일지 목록을 불러올 수 없습니다: ", error);
            alert("일지 데이터를 불러오는 중 오류가 발생했습니다.");
        }
        setLoading(false);
    };


    return (
        <div className='max-w-2xl mx-auto mt-10 bg-white p-6 rounded-xl shadow'>
            <h2 className='text-2xl font-bold mb-4'>프로젝트 일지 목록</h2>

            <select
                value={selectedProject}
                onChange={(e) => {
                    const value = e.target.value;
                    setSelectedProject(value);
                    if (value) {
                        fetchDiaries(value);
                    } else {
                        setDiaries([]);
                    }
                }}
                className='w-full border rounded-md px-3 py-2 mb-4'
            >
                <option value="">프로젝트 선택</option>
                {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>

            {loading ? (
                <p className='text-gray-500 text-center'>불러오는 중...</p>
            ) : diaries.length === 0 ? (
                <p className='text-gray-500 text-center'>작성된 일지가 없습니다.</p>
            ) : (
                <ul className='space-y-3'>
                    {diaries.map((diary) => (
                        <li
                            key={diary.id}
                            className='border p-4 rounded-lg hover:bg-gray-50 transition'
                        >
                            <h3 className='font-semibold text-lg'>{diary.title}</h3>
                            <p className='text-sm text-gray-700 mt-2 line-clamp-2'>{diary.content}</p>
                        </li>
                    ))}
                </ul>
            )}

        </div>
    )
}

export default DiaryListPage