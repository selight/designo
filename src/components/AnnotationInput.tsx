// src/components/AnnotationInput.tsx
import React, { useState } from "react";

interface AnnotationInputProps {
    position: [number, number, number];
    onSave: (text: string) => void;
    onCancel: () => void;
}

const AnnotationInput: React.FC<AnnotationInputProps> = ({

                                                             onSave,
                                                             onCancel
                                                         }) => {
    const [text, setText] = useState("");

    return (
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(20, 20, 20, 0.9)",
                padding: "12px 16px",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                zIndex: 10
            }}
        >
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter annotation..."
                style={{
                    background: "#111",
                    color: "#fff",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    padding: "6px"
                }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                    onClick={() => onSave(text)}
                    style={{
                        background: "#2196f3",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        color: "#fff",
                        cursor: "pointer"
                    }}
                >
                    Save
                </button>
                <button
                    onClick={onCancel}
                    style={{
                        background: "#555",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        color: "#fff",
                        cursor: "pointer"
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default AnnotationInput;
