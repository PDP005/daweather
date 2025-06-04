import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { deleteUser, signOut } from "firebase/auth";
import "../styles/UserInfo.css";

function UserInfo() {
  const [userData, setUserData] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData({
          name: userSnap.data().name || user.displayName || "User",
          email: user.email,
          createdAt: user.metadata.creationTime,
        });
      }
    };
    fetchUserData();
  }, [navigate]);

  const handleDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setDeleteError("No user logged in");
        return;
      }

      // Delete user data from Firestore
      await deleteDoc(doc(db, "users", user.uid));

      // Delete user authentication
      await deleteUser(user);

      // Sign out and redirect to login
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === "auth/requires-recent-login") {
        setDeleteError(
          "Please log out and log in again to delete your account for security reasons."
        );
      } else {
        setDeleteError("Error deleting account. Please try again.");
      }
    }
  };

  if (!userData) {
    return <div style={{ padding: 32 }}>Loading user info...</div>;
  }

  return (
    <div className="userinfo-outer">
      <div className="userinfo-card">
        <h2>User Information</h2>
        <div style={{ margin: "1.5rem 0" }}>
          <strong>Name:</strong>
          <div className="userinfo-field">{userData.name}</div>
          <strong>Email:</strong>
          <div className="userinfo-field">{userData.email}</div>
          <strong>Account Created:</strong>
          <div className="userinfo-field">{userData.createdAt}</div>
        </div>
        <div
          style={{
            margin: "1.5rem 0",
            display: "flex",
            gap: "1rem",
          }}
        >
          <button onClick={() => navigate(-1)}>Back</button>
          <button
            onClick={() => setShowConfirmDialog(true)}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Delete Account
          </button>
        </div>

        {deleteError && (
          <p style={{ color: "#dc3545", marginTop: "1rem" }}>{deleteError}</p>
        )}

        {showConfirmDialog && (
          <div className="modal-overlay">
            <div
              className="modal"
              style={{
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <h3>Are you sure you want to delete your account?</h3>
              <p>This action cannot be undone.</p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Yes, Delete Account
                </button>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  style={{
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserInfo;
