const { app, BrowserWindow } = require("electron");

const is_dev = process.env.NODE_ENV !== "production";

function create_main_window() {
  const main_window = new BrowserWindow({
    title: "manage rclone services",
    width: 1000,
    height: 640,
  });

  if (is_dev) {
    main_window.webContents.openDevTools();
  }
  main_window.removeMenu();

  main_window.loadFile("./front/main.html");
}

app.whenReady().then(() => {
  create_main_window();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      create_main_window();
    }
  });
});
