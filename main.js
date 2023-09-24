const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { exec } = require("child_process");

const is_dev = process.env.NODE_ENV !== "production";

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

function create_main_window() {
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

  main_window.loadFile(path.join(__dirname, "./front/main.html"));
}

app.whenReady().then(() => {
  create_main_window();

  check_rclone((status) => {
    main_window.webContents.send("rclone:check", { status: status });
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});

ipcMain.on("rclone:start", (e, data) => {
  console.log(data.rclone_path);
  const script_path = path.join(__dirname, "scripts", "run_rclone.ps1");
  const command = `try {
    $ErrorActionPreference = 'Stop'
    Start-Process powershell -ErrorAction Stop -Verb RunAs -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File ${script_path} ${data.rclone_path}"
}
catch {
    exit 1
}`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log("Error on executing script", error);
    } else {
      main_window.webContents.send("rclone:started");
    }
  });
});

ipcMain.on("rclone:stop", (e, data) => {
  const script_path = path.join(__dirname, "scripts", "stop_rclone.ps1");
  const command = `Start-Process powershell -verb runas -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -file ${script_path}"`;
  exec(command, { shell: "powershell.exe" }, (error, stdout, stderr) => {
    if (error) {
      console.log("Error on executing script", error);
    } else {
      main_window.webContents.send("rclone:stopped");
    }
  });
});
