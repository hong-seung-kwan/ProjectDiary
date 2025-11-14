import React from 'react'


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 flex items-center justify-center bg-black/40 z-50'>
            <div className='bg-white rounded-xl shadow-lg w-[600px] p-6 relative'>
                <button
                    onClick={onClose}
                    className='absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl'
                >
                    X
                </button>
                {children}
            </div>
        </div>
    )
}

export default Modal