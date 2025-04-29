import "./App.css";
import Home from "./components/Home";
import Room from "./components/Room";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { UserProvider } from "./contexts/UserContext";
import { RoomProvider } from "./contexts/RoomContext";

function App() {
  const location = useLocation();
  
  return (
    <UserProvider>
      <RoomProvider>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </AnimatePresence>
      </RoomProvider>
    </UserProvider>
  );
}

export default App;
