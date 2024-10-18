import express, { Request, Response } from "express";
import {
  getAllUsersHandler,
  registerHandler,
  registerConfirmHandler,
  loginAuthHandler,
  resendConfirmationCodeHandler,
  getUserSavedReviewsHandler,
  saveReviewHandler,
  unsaveReviewHandler,
} from "../controllers/userController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express();

router.get("/", getAllUsersHandler);

router.post("/register", registerHandler);
router.post("/registerconfirm", registerConfirmHandler);
router.post("/resendconfirm", resendConfirmationCodeHandler);
router.post("/login", loginAuthHandler);

router.post("/save", authenticateToken, saveReviewHandler);
router.post("/unsave", authenticateToken, unsaveReviewHandler);
router.post("/saved", authenticateToken, getUserSavedReviewsHandler);

router.get("/protected", authenticateToken, (req: Request, res: Response) => {
  res.json({ message: "Protected data"});
});

export default router;
