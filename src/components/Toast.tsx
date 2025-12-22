import { CheckCircle, Info, XCircle } from 'lucide-react';
import React, { useEffect } from 'react'

interface ToastProps {
    message: string;
    type?: "success" | "error" | "info"
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = "info", onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 2500);
        return () => clearTimeout(timer);
    }, [onClose]);

    const baseStyle =
        "fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white text-sm transition-all duration-300";
    const bgColor =
        type === "success"
            ? "bg-green-500"
            : type === "error"
                ? "bg-red-500"
                : "bg-blue-500";
    
    const Icon =
        type === "success" ? CheckCircle : type === "error" ? XCircle : Info;

        return (
            <div className={`${baseStyle} ${bgColor}`}>
                <Icon className="w-5 h-5"/>
                <span>{message}</span>
            </div>
        )
}

export default Toast