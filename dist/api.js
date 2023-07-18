"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const redis_1 = require("redis");
const Captcha_1 = require("./Captcha");
const Tezos_1 = require("./Tezos");
const Types_1 = require("./Types");
const pow_1 = require("./pow");
dotenv_1.default.config();
exports.redis = (0, redis_1.createClient)({
// url: "redis://localhost:6379",
}).on("error", (err) => console.log("Redis Client Error", err));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
app.use((_, res, next) => {
    const cors = process.env.AUTHORIZED_HOST || "*";
    res.setHeader("Access-Control-Allow-Origin", cors);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.get("/info", (_, res) => {
    try {
        const profiles = {
            user: {
                profile: Types_1.Profile.USER,
                amount: process.env.FAUCET_AMOUNT_USER || Tezos_1.defaultUserAmount,
                currency: "tez",
            },
            baker: {
                profile: Types_1.Profile.BAKER,
                amount: process.env.FAUCET_AMOUNT_BAKER || Tezos_1.defaultBakerAmount,
                currency: "tez",
            },
        };
        const info = {
            faucetAddress: process.env.FAUCET_ADDRESS,
            captchaEnable: JSON.parse(process.env.ENABLE_CAPTCHA),
            profiles,
            maxBalance: process.env.MAX_BALANCE,
        };
        res.status(200).send(info);
    }
    catch (error) {
        res.status(500).send({ status: "ERROR", message: "An exception occurred" });
    }
});
app.post("/challenge", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address, captchaToken, profile } = req.body;
    if (!address || !profile) {
        return res.status(400).send({
            satus: "ERROR",
            message: "'address' and 'profile' fields are required",
        });
    }
    if (!(0, Tezos_1.validateAddress)(res, address))
        return;
    if (captchaToken && !(yield (0, Captcha_1.validateCaptcha)(res, captchaToken)))
        return;
    try {
        (0, Tezos_1.getTezAmountForProfile)(profile);
    }
    catch (e) {
        return res.status(400).send({ status: "ERROR", message: e.message });
    }
    try {
        const challengeKey = (0, pow_1.getChallengeKey)(address);
        let { challenge, challengesNeeded, counter, difficulty } = (yield (0, pow_1.getChallenge)(challengeKey)) || {};
        if (!challenge) {
            // If a captcha was sent it was validated above.
            const usedCaptcha = !!captchaToken;
            ({ challenge, challengesNeeded, difficulty } =
                (0, pow_1.createChallenge)(usedCaptcha));
            counter = 1;
            yield (0, pow_1.saveChallenge)(challengeKey, {
                challenge,
                challengesNeeded,
                counter,
                difficulty,
                usedCaptcha,
            });
        }
        console.log({ challenge, difficulty });
        return res.status(200).send({
            status: "SUCCESS",
            challenge,
            counter,
            difficulty,
        });
    }
    catch (err) {
        const message = "Error getting challenge";
        console.error(message, err);
        return res.status(500).send({ status: "ERROR", message });
    }
}));
app.post("/verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address, solution, nonce, profile } = req.body;
    if (!address || !solution || !nonce) {
        return res.status(400).send({
            status: "ERROR",
            message: "'address', 'solution', and 'nonce' fields are required",
        });
    }
    if (!(0, Tezos_1.validateAddress)(res, address))
        return;
    try {
        const challengeKey = (0, pow_1.getChallengeKey)(address);
        const redisChallenge = yield (0, pow_1.getChallenge)(challengeKey);
        if (!redisChallenge) {
            return res
                .status(400)
                .send({ status: "ERROR", message: "No challenge found" });
        }
        const { challenge, challengesNeeded, counter, difficulty, usedCaptcha } = redisChallenge;
        const isValidSolution = (0, pow_1.verifySolution)({
            challenge,
            difficulty,
            nonce,
            solution,
        });
        console.log({ address, solution, nonce, counter });
        if (!isValidSolution) {
            return res
                .status(400)
                .send({ status: "ERROR", message: "Incorrect solution" });
        }
        if (counter < challengesNeeded) {
            const newChallenge = (0, pow_1.createChallenge)(usedCaptcha);
            const resData = {
                challenge: newChallenge.challenge,
                counter: counter + 1,
                difficulty: newChallenge.difficulty,
            };
            yield (0, pow_1.saveChallenge)(challengeKey, Object.assign({ challengesNeeded: newChallenge.challengesNeeded }, resData));
            return res.status(200).send(Object.assign({ status: "SUCCESS" }, resData));
        }
        // The challenge should be deleted from redis before Tez is sent. If it
        // failed to delete, the user could keep getting Tez with the same solution.
        yield exports.redis.del(challengeKey).catch((e) => {
            console.error(`Redis failed to delete ${challengeKey}.`);
            throw e;
        });
        // Here is where you would send the tez to the user's address
        // For the sake of this example, we're just logging the address
        console.log(`Send tez to ${address}`);
        const amount = (0, Tezos_1.getTezAmountForProfile)("BAKER");
        const b = {};
        // b.txHash = await send(amount, address)
        b.txHash = "hash";
        return res
            .status(200)
            .send(Object.assign(Object.assign({}, b), { status: "SUCCESS", message: "Tez sent" }));
    }
    catch (err) {
        console.error(err.message);
        return res
            .status(500)
            .send({ status: "ERROR", message: "An error occurred" });
    }
}));
const port = process.env.API_PORT || 3000;
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.redis.connect();
    console.log("Connected to redis.");
    app.listen(port, () => {
        console.log(`Start API on port ${port}.`);
    });
}))();
