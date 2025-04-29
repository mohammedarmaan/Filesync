import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useRoom } from "../contexts/RoomContext";
import MotionText from "./motion-text";

const Home = () => {
  const navigate = useNavigate();
  const { user, createTemporaryUser } = useUser();
  const { createRoom, joinRoom } = useRoom();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (!nickname.trim()) {
        setError("Please enter a nickname");
        return;
      }
      createTemporaryUser(nickname);
    }
    try {
      const code = await createRoom();
      navigate(`/room/${code}`);
    } catch (err) {
      setError("Failed to create room. Please try again.");
    }
  };

  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (!nickname.trim()) {
        setError("Please enter a nickname");
        return;
      }
      createTemporaryUser(nickname);
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    try {
      const joined = await joinRoom(roomCode);
      if (!joined) {
        setError("Room not found");
        return;
      }
      navigate(`/room/${roomCode}`);
    } catch (err) {
      setError("Failed to join room. Please try again.");
    }
  };

  const toggleMode = () => {
    setIsJoining(!isJoining);
    setError("");
  };

  return (
    <div className="container flex flex-col items-center justify-center h-screen bg-red-400 text-white space-y-6">
      <div className="text-4xl font-bold">FileSync</div>
      <div className="text-2xl font-semibold">
        <MotionText delayOffset={0}>
          Share files in a flash, with zero hassle.
        </MotionText>
      </div>

      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg text-gray-800">
        {!user ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        ) : (
          <p className="text-center mb-4">Welcome, {user.nickname}!</p>
        )}

        {isJoining ? (
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <input
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="submit"
              className="w-full p-2 bg-red-400 text-white rounded hover:bg-red-500 transition-colors"
            >
              Join Room
            </button>
          </form>
        ) : (
          <button
            onClick={handleCreateRoom}
            className="w-full p-2 bg-red-400 text-white rounded hover:bg-red-500 transition-colors"
          >
            Create Room
          </button>
        )}

        <button
          onClick={toggleMode}
          className="w-full mt-4 p-2 border border-red-400 text-red-400 rounded hover:bg-red-50 transition-colors"
        >
          {isJoining ? "Create a new room instead" : "Join an existing room"}
        </button>
      </div>
    </div>
  );
};

export default Home;
