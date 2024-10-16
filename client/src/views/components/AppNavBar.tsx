import { useContext, useState } from "react";
import { useIsMobile } from "../../helpers/hooks/useIsMobile";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { LoginModal } from "./LoginModal";
import { AuthContext } from "../../helpers/AuthContext";

export function AppNavBar({
  isDarkTheme,
  changeTheme,
}: {
  isDarkTheme: boolean;
  changeTheme: () => void;
}) {
  const { isAuthenticated, userName, logout } = useContext(AuthContext);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showNavItems, setShowNavItems] = useState(true);

  const navigateToPage = (path: string) => {
    if (window.location.pathname !== path) navigate(path);
  };

  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <a
          className="navbar-brand"
          href="/"
          style={{
            color: "rgb(178, 29, 79)",
            fontFamily: "fantasy",
            fontWeight: "bold",
          }}
        >
          Playerest
        </a>
        {/* Explore Menu */}
        {!isMobile ? (
          <>
            <div className="nav-item me-2">
              <a
                className="nav-link active"
                aria-current="page"
                href="/"
                style={{ fontFamily: "-moz-initial" }}
              >
                Explore
              </a>
            </div>

            <div className="nav-item me-2 mx-2">
              <a
                className="nav-link active p-0"
                aria-current="page"
                href="/create"
                style={{ fontFamily: "-moz-initial" }}
              >
                <span className="nav-text"> Create</span>
              </a>
            </div>
          </>
        ) : (
          <div className="nav-item me-2 mx-2">
            <a
              className="nav-link active p-0"
              aria-current="page"
              href="/create"
              style={{ fontFamily: "-moz-initial" }}
            >
              <span className="fa-solid fa-pen-nib nav-icon p-0" />
            </a>
          </div>
        )}

        <SearchBar onToggleNavItems={(show) => setShowNavItems(show)} />
        <div className="nav navbar-nav navbar-right d-flex flex-row align-content-center">
          <button onClick={changeTheme} className="nav-item btn-nav me-2">
            <i
              className={`fa-moon fa-${isDarkTheme ? "solid" : "regular"} align-content-center`}
              style={{ fontSize: "1.5rem" }}
            ></i>
          </button>

          {showNavItems && isAuthenticated ? (
            <>
              <button
                className="nav-item btn-nav me-2"
                onClick={() => navigateToPage("/profile?user=" + userName)}
              >
                <span className="fas fa-user nav-icon" />
                <span className="nav-text">Profile</span>
              </button>
              <button className="nav-item btn-nav me-2" onClick={logout}>
                <span className="fas fa-sign-in-alt nav-icon" />
                <span className="nav-text">Logout</span>
              </button>
            </>
          ) : (
            <button className="nav-item btn-nav me-2" onClick={handleShow}>
              <span className="fas fa-sign-in-alt nav-icon" />
              <span className="nav-text">Login</span>
            </button>
          )}
        </div>
        <LoginModal show={showModal} handleClose={handleClose} />
      </div>
    </nav>
  );
}
