import { Router, type IRouter } from "express";
import healthRouter from "./health";
import restaurantsRouter from "./restaurants";
import menusRouter from "./menus";
import dishesRouter from "./dishes";
import publicRouter from "./public";

const router: IRouter = Router();

router.use(healthRouter);
router.use(restaurantsRouter);
router.use(menusRouter);
router.use(dishesRouter);
router.use(publicRouter);

export default router;
