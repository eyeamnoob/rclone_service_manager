const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { exec } = require("child_process");
const fs = require("node:fs");
const os = require("node:os");

process.env.NODE_ENV = "dev";

const is_dev = process.env.NODE_ENV !== "production";

const RESOURCES_PATH = is_dev ? __dirname : process.resourcesPath;

let main_window;

function check_rclone(callback) {
  const command =
    "Get-Service -Name Rclone -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status";
  const output = exec(
    command,
    { shell: "powershell.exe" },
    (error, stdout, stderr) => {
      if (error) {
        callback("stopped");
      } else {
        if (stdout.trim().length > 0) {
          if (stdout.trim() === "Running") {
            callback("running");
          } else if (stdout.trim() === "Stopped") {
            callback("stopped");
          } else {
            callback("stopped");
          }
        } else {
          callback("stopped");
        }
      }
    }
  );
}

async function create_main_window() {
  main_window = new BrowserWindow({
    title: "manage rclone services",
    width: 1000,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  if (is_dev) {
    main_window.webContents.openDevTools();
  }

  main_window.removeMenu();

  await main_window.loadFile(path.join(__dirname, "./front/main.html"));
}

app.whenReady().then(async () => {
  await create_main_window();

  check_rclone((status) => {
    main_window.webContents.send("rclone:check", { status: status });
  });
  main_window.webContents.send("error", {
    message: "hello from the back-end",
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});

function create_config_file(data) {
  const config_file_template =
    "# last modified on {last_mod_date}\n" +
    "[{name}]\n" +
    "type = swift\n" +
    "env_auth = false\n" +
    "user = {username}\n" +
    "key = {password}\n" +
    "region = us-east-1\n" +
    "auth = https://api.zdrive.ir/auth/v1.0";

  const username = data.username;
  const password = data.password;
  const endpoint = data.endpoint;

  if (!username || !password || !endpoint) {
    return -1;
  }

  const user_home_dir = os.homedir();
  const application_dir = user_home_dir + "\\rclone_service_manager";
  fs.existsSync(application_dir) ||
    fs.mkdirSync(application_dir, { recursive: true });

  const config_file = application_dir + `\\${endpoint}.conf`;

  if (fs.existsSync(config_file)) {
    return 1; // config file exists. so we need to use it or overwrite it.
  }

  const ready_to_write = config_file_template
    .replace("{name}", endpoint)
    .replace("{username}", username)
    .replace("{password}", password)
    .replace("{last_mode_date}", new Date());

  fs.writeFile(config_file, ready_to_write);

  return config_file;
}

ipcMain.on("rclone:start", (e, data) => {
  console.log(data);
  return; // remember to delete these two lines.
  const script_path = path.join(RESOURCES_PATH, "scripts", "run_rclone.ps1");
  const rclone_log_file = `C:\\rclone_log_${new Date()}.txt`;
  const rclone_config_file = create_config_file(data);

  if (rclone_config_file == 1) {
    console.log("config file already exists");
    main_window.webContents.send("error", {
      message: "config file already exists",
    });
  } else if (rclone_config_file == -1) {
    console.log("provide all required informations");
    main_window.webContents.send("error", {
      message: "provide all required informations",
    });
    return;
  }

  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path} ${data.rclone_path} ${rclone_log_file} ${rclone_config_file}"
      if ($output.ExitCode -ne 0) {
          exit 1
      }
      exit 0
  }
  catch {
      exit 1
  }`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log(`Error on executing script: ${script_path}`);
    } else {
      main_window.webContents.send("rclone:started");
    }
  });
});

ipcMain.on("rclone:stop", (e, data) => {
  const script_path = path.join(RESOURCES_PATH, "scripts", "stop_rclone.ps1");
  const command = `Start-Process powershell -verb runas -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -file ${script_path}"`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log("Error on executing script", error);
    } else {
      main_window.webContents.send("rclone:stopped");
    }
  });
});

ipcMain.on("service:create", (e, data) => {
  const script_path = path.join(
    RESOURCES_PATH,
    "scripts",
    "create_service.ps1"
  );
  const name = data.name;
  const user_command = data.command;
  const command = `$ErrorActionPreference = 'stop'
  try {
      $output = Start-Process powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File '${script_path}' '${name}' '${user_command}'"
      if ($output.ExitCode -ne 0) {
          exit 1
      }
      exit 0
  }
  catch {
      exit 1
  }`;
  console.log(command);
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log(`Error on executing script: ${script_path}`);
    } else {
      main_window.webContents.send("service:created", {
        name,
        command: user_command,
        status: "stopped",
      });
    }
  });
});
