import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';

interface Project {
    id: string;
    name: string;
}
interface Diary {
    id: string;
    title: string;
    progress: string;
    troubleshooting: { problem: string; solution: string };
    retrospective: string;
    createdAt: string;
    tags?: string[];
    projectId: string;
}


const DiaryListPage = () => {

    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "" }>({
        message: "",
        type: "",
    })
    const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
        setToast({ message, type });
    }


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

    useEffect(() => {
        if (user && projects.length > 0 && selectedProject === "") {
            fetchAllDiaries();
        }
    }, [user, projects]);

    const fetchDiaries = async (projectId: string) => {
        if (!user || !projectId) return;
        setLoading(true);
        try {
            const diariesRef = collection(db, "users", user.uid, "projects", projectId, "diaries");
            const q = query(diariesRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const list = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "제목없음",
                    progress: data.progress || "",
                    troubleshooting: data.troubleshooting || {
                        problem: "",
                        solution: "",
                    },
                    retrospective: data.retrospective || "",
                    tags: data.tags || [],
                    projectId,
                    createdAt: data.createdAt?.toDate().toLocaleDateString() || "-",
                }
            })

            setDiaries(list);
        } catch (error) {
            console.error("일지 목록을 불러올 수 없습니다: ", error);
            alert("일지 데이터를 불러오는 중 오류가 발생했습니다.");
        }
        setLoading(false);
    };

    // 검색
    const filteredDiaries = diaries.filter(
        (d) =>
            d.title.toLowerCase().includes(search.toLowerCase()) ||
            d.progress.toLowerCase().includes(search.toLowerCase()) ||
            d.tags?.some((t) =>
                t.toLowerCase().includes(search.toLowerCase())
            )
    );

    // 전체 프로젝트 일지 불러오기
    const fetchAllDiaries = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const allDiaries: Diary[] = [];

            for (const project of projects) {
                const diariesRef = collection(
                    db,
                    "users",
                    user.uid,
                    "projects",
                    project.id,
                    "diaries"
                );
                const q = query(diariesRef, orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);

                snapshot.docs.forEach((doc) => {
                    const data = doc.data();
                    allDiaries.push({
                        id: doc.id,
                        title: data.title || "제목없음",
                        progress: data.progress || "",
                        troubleshooting: data.troubleshooting || { problem: "", solution: "" },
                        retrospective: data.retrospective || "",
                        tags: data.tags || [],
                        projectId: project.id,
                        createdAt: data.createdAt
                            ? data.createdAt.toDate().toLocaleDateString()
                            : "-",
                    });
                });
            }

            setDiaries(allDiaries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
        } catch (error) {
            console.error("전체 일지 로드 실패:", error);
            alert("전체 일지 데이터를 불러오는 중 오류가 발생했습니다.");
        }

        setLoading(false);
    };

    const handleDelete = async (projectId: string, diaryId: string) => {
        if (!user) return;
        const confirmDelete = window.confirm("정말 이 일지를 삭제하시겠습니까??");
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "projects", projectId, "diaries", diaryId));
            setDiaries((prev) => prev.filter((d) => d.id !== diaryId));
            showToast("일지가 삭제되었습니다!","success");
        } catch (error) {
            console.log("삭제 실패", error);
            alert("일지를 삭제하는 중 오류가 발생했습니다.");
        }
    }

    return (
        <div>
            <h2 className='text-3xl font-bold mb-4 text-gray-800'>프로젝트 일지 목록</h2>
            <p className='text-gray-500 mb-6'>
                작성한 모든 프로젝트 일지를 확인하고 관리하세요.
            </p>
            {/* 검색창 */}
            <input
                type='text'
                placeholder='프로젝트명, 내용, 태그로 검색...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-4 focus:ring-2 focus:ring-blue-400 outline-none'
            />
            {/* 프로젝트 필터 */}
            <div className='flex flex-wrap gap-2 mb-6'>
                <button
                    onClick={() => {
                        setSelectedProject("");
                        fetchAllDiaries();
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm ${selectedProject === ""
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                >
                    전체
                </button>
                {projects.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => {
                            setSelectedProject(p.id)
                            fetchDiaries(p.id);
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm ${selectedProject === p.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className='text-gray-500 text-center'>불러오는 중...</p>
            ) : filteredDiaries.length === 0 ? (
                <p className='text-gray-500 text-center'>작성된 일지가 없습니다.</p>
            ) : (
                <div className="space-y-4">
                    {filteredDiaries.map((d) => (
                        <div
                            key={d.id}
                            className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                        >
                            {/* 카드 헤더 */}
                            <div
                                onClick={() =>
                                    setExpanded(expanded === d.id ? null : d.id)
                                }
                                className="flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-gray-50 transition"
                            >
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-800">
                                        {d.title}
                                    </h3>
                                    <p className="text-xs text-gray-500">{d.createdAt}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {d.tags &&
                                            d.tags.map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                    </div>
                                </div>
                                {expanded === d.id ? (
                                    <ChevronUp className="text-gray-500" />
                                ) : (
                                    <ChevronDown className="text-gray-500" />
                                )}
                            </div>

                            {/* 카드 상세 내용 */}
                            {expanded === d.id && (
                                <div className="border-t px-6 py-4 bg-gray-50 space-y-3">
                                    {/* 오늘 진행 내용 */}
                                    {d.progress && (
                                        <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                                            <h4 className="text-green-700 font-semibold text-sm mb-1">
                                                오늘 진행내용
                                            </h4>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {d.progress}
                                            </p>
                                        </div>
                                    )}

                                    {/* 트러블슈팅 */}
                                    {(d.troubleshooting.problem || d.troubleshooting.solution) && (
                                        <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                                            <h4 className="text-orange-700 font-semibold text-sm mb-1">
                                                트러블슈팅
                                            </h4>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                문제 상황: {d.troubleshooting.problem}
                                            </p>
                                            {d.troubleshooting.solution && (
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">
                                                    해결 과정: {d.troubleshooting.solution}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* 회고 */}
                                    {d.retrospective && (
                                        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                            <h4 className="text-blue-700 font-semibold text-sm mb-1">
                                                회고
                                            </h4>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {d.retrospective}
                                            </p>
                                        </div>
                                    )}

                                    {/* 하단 버튼 */}
                                    <div className="flex justify-between items-center pt-2">
                                        <button
                                            onClick={() =>
                                                navigate(`/project/${d.projectId}`)
                                            }
                                            className="flex items-center gap-1 text-sm text-gray-700 hover:bg-green-700 hover:text-white border border-gray-300 rounded-md px-3 py-1 transition"
                                        >
                                            프로젝트 보기
                                        </button>

                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() =>
                                                    navigate("/diary-write", {
                                                        state: { editDiary: d },
                                                    })
                                                }
                                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                <Edit size={14} /> 수정
                                            </button>

                                            <button
                                                onClick={() => handleDelete(d.projectId, d.id)}
                                                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 size={14} /> 삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
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

export default DiaryListPage