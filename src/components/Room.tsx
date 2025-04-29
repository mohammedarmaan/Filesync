import { useState, useRef, ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useRoom } from "../contexts/RoomContext";
import { storage } from "../hooks/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface FileUploadProgress {
  [key: string]: number;
}

const Room = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const { user } = useUser();
  const { room, leaveRoom, addFile } = useRoom();
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/");
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !room) return;

    Array.from(files).forEach(async (file) => {
      const fileId = `${room.code}/${Date.now()}-${file.name}`;
      const fileRef = storageRef(storage, fileId);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress((prev) => ({
            ...prev,
            [fileId]: progress,
          }));
        },
        (error) => {
          console.error("Upload error:", error);
        },
        async () => {
          const downloadURL = await getDownloadURL(fileRef);
          await addFile({
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.type,
            senderId: user.userId,
            senderName: user.nickname,
          });

          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }
      );
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!user || !room) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Room not found or unauthorized</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-red-400 p-4 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Room: {room.code}</h1>
            <p className="text-sm">Share this code with others to join</p>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-white text-red-500 rounded hover:bg-red-50 transition-colors"
          >
            Leave Room
          </button>
        </div>

        {/* File history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {room.files?.map((file) => (
            <div
              key={file.id}
              className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  Sent by {file.senderName} • {new Date(file.timestamp).toLocaleString()}
                </p>
              </div>
              <a
                href={file.url}
                download={file.name}
                className="px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500 transition-colors"
              >
                Download
              </a>
            </div>
          ))}
        </div>

        {/* Upload area */}
        <div className="p-4 border-t bg-white">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer block w-full p-4 border-2 border-dashed border-red-400 rounded-lg text-center hover:bg-red-50 transition-colors"
          >
            Click or drag files to upload
          </label>

          {/* Upload progress */}
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="mt-2">
              <div className="text-sm text-gray-600">
                Uploading {fileId.split("/").pop()}...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-red-400 h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users sidebar */}
      <div className="w-64 bg-white border-l">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Users in Room</h2>
        </div>
        <div className="p-4">
          {room.activeUsers?.map((activeUser) => (
            <div
              key={activeUser.userId}
              className="flex items-center space-x-2 mb-2"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>
                {activeUser.nickname}
                {activeUser.isAdmin && (
                  <span className="text-sm text-gray-500"> (admin)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Room;
