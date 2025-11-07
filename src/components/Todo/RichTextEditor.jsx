// src/components/Tasks/RichTextEditor.jsx
import React, { useRef, useState, useEffect } from "react";

const RichTextEditor = ({ value, onChange, placeholder = "Enter text..." }) => {
    const editorRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeFormat, setActiveFormat] = useState({});

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    // Update active formats
    const updateActiveFormats = () => {
        if (!editorRef.current) return;
        
        setActiveFormat({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight')
        });
    };

    // Safe exec command with focus management
    const execCommand = (command, value = null) => {
        if (!editorRef.current) return;
        
        try {
            // Focus the editor first
            editorRef.current.focus();
            
            // Execute the command
            document.execCommand(command, false, value);
            
            // Update active formats
            updateActiveFormats();
            
            // Notify parent of content change
            if (onChange) {
                onChange(editorRef.current.innerHTML);
            }
        } catch (error) {
            console.warn(`Command ${command} failed:`, error);
        }
    };

    const handleInput = () => {
        if (editorRef.current && onChange) {
            onChange(editorRef.current.innerHTML);
        }
        updateActiveFormats();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const toggleColorPicker = () => {
        setShowColorPicker(!showColorPicker);
    };

    const applyColor = (color) => {
        execCommand('foreColor', color);
        setShowColorPicker(false);
    };

    const insertList = (type) => {
        execCommand(type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList');
    };

    const colors = [
        '#000000', '#ffffff', '#ef4444', '#f59e0b', '#84cc16',
        '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
        '#dc2626', '#ea580c', '#65a30d', '#0891b2', '#1d4ed8',
        '#7c3aed', '#db2777', '#475569'
    ];

    return (
        <div className="rich-text-editor">
            {/* Toolbar */}
            <div className="editor-toolbar" style={{
                display: 'flex',
                gap: '2px',
                padding: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderBottom: 'none',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
                flexWrap: 'wrap'
            }}>
                {/* Font Style */}
                <button
                    type="button"
                    className={`btn btn-sm ${activeFormat.bold ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => execCommand('bold')}
                    title="Bold"
                    style={{
                        background: activeFormat.bold ? '#3b82f6' : 'transparent',
                        border: '1px solid #475569',
                        color: activeFormat.bold ? 'white' : '#94a3b8',
                        padding: '4px 8px',
                        fontSize: '12px'
                    }}
                >
                    <strong>B</strong>
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${activeFormat.italic ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => execCommand('italic')}
                    title="Italic"
                    style={{
                        background: activeFormat.italic ? '#3b82f6' : 'transparent',
                        border: '1px solid #475569',
                        color: activeFormat.italic ? 'white' : '#94a3b8',
                        padding: '4px 8px',
                        fontSize: '12px'
                    }}
                >
                    <em>I</em>
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${activeFormat.underline ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => execCommand('underline')}
                    title="Underline"
                    style={{
                        background: activeFormat.underline ? '#3b82f6' : 'transparent',
                        border: '1px solid #475569',
                        color: activeFormat.underline ? 'white' : '#94a3b8',
                        padding: '4px 8px',
                        fontSize: '12px'
                    }}
                >
                    <u>U</u>
                </button>

                {/* Text Alignment */}
                <div style={{ display: 'flex', gap: '1px' }}>
                    <button
                        type="button"
                        className={`btn btn-sm ${activeFormat.justifyLeft ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => execCommand('justifyLeft')}
                        title="Align Left"
                        style={{
                            background: activeFormat.justifyLeft ? '#3b82f6' : 'transparent',
                            border: '1px solid #475569',
                            color: activeFormat.justifyLeft ? 'white' : '#94a3b8',
                            padding: '4px 6px',
                            fontSize: '10px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h12v1H2zm0 3h8v1H2zm0 3h12v1H2zm0 3h8v1H2zm0 3h12v1H2z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${activeFormat.justifyCenter ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => execCommand('justifyCenter')}
                        title="Align Center"
                        style={{
                            background: activeFormat.justifyCenter ? '#3b82f6' : 'transparent',
                            border: '1px solid #475569',
                            color: activeFormat.justifyCenter ? 'white' : '#94a3b8',
                            padding: '4px 6px',
                            fontSize: '10px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h12v1H2zm2 3h8v1H4zm-2 3h12v1H2zm2 3h8v1H4zm-2 3h12v1H2z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${activeFormat.justifyRight ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => execCommand('justifyRight')}
                        title="Align Right"
                        style={{
                            background: activeFormat.justifyRight ? '#3b82f6' : 'transparent',
                            border: '1px solid #475569',
                            color: activeFormat.justifyRight ? 'white' : '#94a3b8',
                            padding: '4px 6px',
                            fontSize: '10px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h12v1H2zm4 3h8v1H6zm-4 3h12v1H2zm4 3h8v1H6zm-4 3h12v1H2z" />
                        </svg>
                    </button>
                </div>

                {/* Lists */}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => insertList('unordered')}
                    title="Bullet List"
                    style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#94a3b8',
                        padding: '4px 6px',
                        fontSize: '10px'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="3" cy="4" r="1.5" />
                        <circle cx="3" cy="8" r="1.5" />
                        <circle cx="3" cy="12" r="1.5" />
                        <path d="M5 4h8v1H5zm0 4h8v1H5zm0 4h8v1H5z" />
                    </svg>
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => insertList('ordered')}
                    title="Numbered List"
                    style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#94a3b8',
                        padding: '4px 6px',
                        fontSize: '10px'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2h1v1H2zm0 3h1v1H2zm0 3h1v1H2zm0 3h1v1H2zm0 3h1v1H2zM4 3h8v1H4zm0 4h8v1H4zm0 4h8v1H4zm0 4h8v1H4z" />
                        <text x="1.5" y="3.5" fontSize="3" textAnchor="middle">1</text>
                        <text x="1.5" y="7.5" fontSize="3" textAnchor="middle">2</text>
                        <text x="1.5" y="11.5" fontSize="3" textAnchor="middle">3</text>
                    </svg>
                </button>

                {/* Color Picker */}
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={toggleColorPicker}
                        title="Text Color"
                        style={{
                            background: 'transparent',
                            border: '1px solid #475569',
                            color: '#94a3b8',
                            padding: '4px 6px',
                            fontSize: '10px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1L1 15h14L8 1zm0 3l4.5 9h-9L8 4z" />
                            <path d="M11 12a1 1 0 100 2 1 1 0 000-2z" fill="#ef4444" />
                        </svg>
                    </button>
                    {showColorPicker && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            padding: '8px',
                            zIndex: 1000,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            width: '120px'
                        }}>
                            {colors.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: color,
                                        border: color === '#ffffff' ? '1px solid #475569' : 'none',
                                        borderRadius: '2px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => applyColor(color)}
                                    title={color}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Clear Formatting */}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => execCommand('removeFormat')}
                    title="Clear Formatting"
                    style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#94a3b8',
                        padding: '4px 6px',
                        fontSize: '10px'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2h12v1H2zm2 3h3v1H4zm5 0h5v1H9zm-7 3h4v1H2zm5 0h3v1H7zm5 0h2v1h-2zm-9 3h6v1H3zm7 0h4v1h-4zm-8 3h12v1H2z" />
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </button>
            </div>

            {/* Editor Area - Using contentEditable div instead of textarea */}
            <div
                ref={editorRef}
                contentEditable
                className="editor-content"
                onInput={handleInput}
                onPaste={handlePaste}
                onBlur={updateActiveFormats}
                onClick={updateActiveFormats}
                onKeyUp={updateActiveFormats}
                style={{
                    minHeight: '120px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    borderTop: 'none',
                    color: '#f1f5f9',
                    padding: '12px',
                    borderRadius: '0 0 4px 4px',
                    outline: 'none',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '1.5'
                }}
                data-placeholder={placeholder}
            />
            
            {/* Placeholder styling */}
            <style>
                {`
                .editor-content:empty:before {
                    content: attr(data-placeholder);
                    color: #64748b;
                    font-style: italic;
                }
                .editor-content:focus {
                    border-color: #3b82f6 !important;
                }
                `}
            </style>
        </div>
    );
};

export default RichTextEditor;