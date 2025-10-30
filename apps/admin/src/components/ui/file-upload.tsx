import React from 'react';

export const FileUpload = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
          Click to upload an image
        </div>
      </label>
    </div>
  );
};