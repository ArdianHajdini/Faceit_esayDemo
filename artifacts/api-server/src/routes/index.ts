import { Router, type IRouter } from "express";
import healthRouter from "./health";
import demosRouter from "./demos";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(demosRouter);
router.use(settingsRouter);

export default router;
