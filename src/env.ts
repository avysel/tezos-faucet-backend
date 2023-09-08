import "dotenv/config"

// This file is responsible for handling environment variables.
// It imports all environment variables from process.env and performs necessary type conversions.
// For some values, it's better to use the converted values from this file instead of process.env directly.
const {
  ENABLE_CAPTCHA,
  DISABLE_CHALLENGES,
  MAX_BALANCE,
  MIN_TEZ,
  MAX_TEZ,
  MAX_CHALLENGES,
  MIN_CHALLENGES,
  DIFFICULTY,
  CAPTCHA_CHALLENGES_REDUCTION_RATIO,
} = process.env

const env = {
  ...process.env,
  DISABLE_CHALLENGES: DISABLE_CHALLENGES === "true",
  ENABLE_CAPTCHA: ENABLE_CAPTCHA !== "false",
  MAX_BALANCE: MAX_BALANCE ? Number(MAX_BALANCE) : 6000,
  MAX_TEZ: MAX_TEZ ? Number(MAX_TEZ) : 6000,
  MIN_TEZ: MIN_TEZ ? Number(MIN_TEZ) : 1,
  MAX_CHALLENGES: MAX_CHALLENGES ? Number(MAX_CHALLENGES) : 120,
  MIN_CHALLENGES: MIN_CHALLENGES ? Number(MIN_CHALLENGES) : 1,
  DIFFICULTY: DIFFICULTY ? Number(DIFFICULTY) : 5,
  CAPTCHA_CHALLENGES_REDUCTION_RATIO: CAPTCHA_CHALLENGES_REDUCTION_RATIO
    ? Number(CAPTCHA_CHALLENGES_REDUCTION_RATIO)
    : 0.5,
}

;[
  env.CAPTCHA_CHALLENGES_REDUCTION_RATIO,
  env.DIFFICULTY,
  env.MAX_BALANCE,
  env.MAX_CHALLENGES,
  env.MAX_TEZ,
  env.MIN_CHALLENGES,
  env.MIN_TEZ,
].forEach((v) => {
  if (isNaN(v))
    throw new Error(
      "Env vars MAX_BALANCE, MIN_TEZ, MAX_TEZ, AVG_SOLUTION_TIME, MAX_CHALLENGES, MIN_CHALLENGES, DIFFICULTY, CAPTCHA_CHALLENGES_REDUCTION_RATIO must be numbers."
    )
})

if (env.DIFFICULTY <= 0) {
  throw new Error("Env var DIFFICULTY must be greater than 0.")
}

if (
  env.CAPTCHA_CHALLENGES_REDUCTION_RATIO < 0 ||
  env.CAPTCHA_CHALLENGES_REDUCTION_RATIO >= 1
) {
  throw new Error(
    "Env var CAPTCHA_CHALLENGES_REDUCTION_RATIO must be >= 0 and < 1."
  )
}

if (
  env.MAX_CHALLENGES < env.MIN_CHALLENGES ||
  env.MIN_CHALLENGES <= 0 ||
  env.MAX_CHALLENGES <= 0
) {
  throw new Error(
    "Env vars MAX_CHALLENGES and MIN_CHALLENGES must be greater than 0 and MAX_CHALLENGES must be greater than or equal to MIN_CHALLENGES."
  )
}

if (env.MAX_TEZ < env.MIN_TEZ || env.MIN_TEZ <= 0 || env.MAX_TEZ <= 0) {
  throw new Error(
    "Env vars MAX_TEZ and MIN_TEZ must be greater than 0 and MAX_TEZ must be greater than or equal to MIN_TEZ."
  )
}

export default env
