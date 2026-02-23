"use strict";
/**
 * Mount all API routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staking_1 = __importDefault(require("./staking"));
const zoo_1 = __importDefault(require("./zoo"));
const router = (0, express_1.Router)();
router.use('/staking', staking_1.default);
router.use('/zoo', zoo_1.default);
exports.default = router;
