module.exports = {
  apps: [{
    name: "mousa-khayal",
    script: "./dist/index.js",
    cwd: "/var/www/mousa-khayal",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      MY_GOOGLE_AI_KEY: "AIzaSyAIMIAu6wWYjHj8CFjm4fq7uQOo2PNEibA",
      OPENAI_API_KEY: "AIzaSyAIMIAu6wWYjHj8CFjm4fq7uQOo2PNEibA",
      OPENAI_MODEL: "gemini-2.5-flash",
      PORT: "3007"
    },
    error_file: "/var/log/mousa-khayal/error.log",
    out_file: "/var/log/mousa-khayal/out.log",
    log_file: "/var/log/mousa-khayal/combined.log",
    time: true,
    max_memory_restart: "512M",
    restart_delay: 3000,
    max_restarts: 10
  }]
};
