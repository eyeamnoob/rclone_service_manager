const services_table_body = document.querySelector("#services-table tbody");
const create_service_button = document.getElementById("create-service-btn");
const create_service_form = document.getElementById("create-service-form");
const submit_button = document.getElementById("submit-btn");
const run_rclone_button = document.getElementById("run-rclone-btn");
const services_table = document.getElementById("services-table");
const file_input = document.getElementById("file-input");
const service_name_input = document.getElementById("service-name");
const username_input = document.getElementById("username");
const password_input = document.getElementById("password");
const endpoint_input = document.getElementById("endpoint");
const extra_args_input = document.getElementById("extraargs");
const rclone_path_txt = document.getElementById("rclone-path");
let rclone_path = "";

let services = {};

let update = false;

function new_service_row(name, endpoint, status) {
  const new_row = document.createElement("tr");

  const name_cell = document.createElement("td");

  const name_text = document.createTextNode(` ${name}`);

  name_cell.appendChild(name_text);

  const endpoint_cell = document.createElement("td");

  endpoint_text = document.createTextNode(` ${endpoint}`);

  endpoint_cell.appendChild(endpoint_text);

  const status_cell = document.createElement("td");

  const toggle_status = document.createElement("button");
  toggle_status.addEventListener("click", () => toggle_rclone_status(name));
  toggle_status.textContent = "toggle status";

  const rm_rclone_button = document.createElement("button");
  rm_rclone_button.addEventListener("click", () =>
    remove_rclone_listener(name)
  );
  rm_rclone_button.textContent = "remove";

  const update_rclone_button = document.createElement("button");
  update_rclone_button.addEventListener("click", () =>
    update_rclone_listener(name)
  );
  update_rclone_button.textContent = "update";

  const status_logo = document.createElement("i");
  if (status) {
    status_logo.classList = "fas fa-circle text-blue";
    status_logo.innerText = "running";
  } else {
    status_logo.classList = "fas fa-circle text-red";
    status_logo.innerText = "stopped";
  }

  status_cell.appendChild(status_logo);
  status_cell.appendChild(toggle_status);
  status_cell.appendChild(rm_rclone_button);
  status_cell.appendChild(update_rclone_button);

  new_row.appendChild(name_cell);
  new_row.appendChild(endpoint_cell);
  new_row.appendChild(status_cell);

  new_row.id = name;
  services_table_body.appendChild(new_row);

  services[name] = {
    status,
    endpoint,
  };
}

function update_rclone_listener(service_name) {
  if (services[service_name].status) {
    Toastify.toast({
      text: "First, please turn off service.",
      duration: 5000,
      close: false,
      stopOnFocus: true,
      style: {
        background: "red",
        color: "white",
        textAlign: "center",
        fontSize: "16px",
        padding: "8px",
      },
    });

    return;
  }
  openForm(service_name);
}

file_input.addEventListener("change", () => {
  rclone_path = file_input.files[0].path;
  rclone_path_txt.innerText = "Using Rclone: " + rclone_path;
  rclone_path_txt.style.display = "block";
  submitForm();
});

function toggle_rclone_status(service_name) {
  IPCRenderer.send("rclone:toggle", {
    service_name,
    status: !services[service_name].status,
  });
}

function remove_rclone_listener(service_name) {
  IPCRenderer.send("rclone:remove", {
    service_name,
  });
}

function openForm(service_name = "") {
  var overlay = document.getElementById("overlay");
  var popup = document.getElementById("popupContainer");

  overlay.style.display = "block";
  popup.style.display = "block";

  if (service_name !== "") {
    const endpoint = services[service_name].endpoint;
    service_name_input.value = service_name;
    endpoint_input.value = endpoint;

    service_name_input.disabled = true;
    endpoint_input.disabled = true;
    extra_args_input.disabled = true;

    update = true;
  } else {
    service_name_input.disabled = false;
    endpoint_input.disabled = false;
    extra_args_input.disabled = false;

    update = false;
  }
}

function closeForm() {
  var overlay = document.getElementById("overlay");
  var popup = document.getElementById("popupContainer");

  overlay.style.display = "none";
  popup.style.display = "none";
}

function submitForm() {
  if (rclone_path.length === 0) {
    file_input.click();
    return;
  }

  const username = username_input.value;
  const password = password_input.value;
  const endpoint = endpoint_input.value;
  let service_name = service_name_input.value;
  const extra_args = extra_args_input.value;

  username_input.value = "";
  password_input.value = "";
  endpoint_input.value = "";
  service_name_input.value = "";
  extra_args_input.value = "";

  if (!service_name) {
    service_name = "Rclone" + crypto.randomUUID();
  }

  IPCRenderer.send("rclone:start", {
    rclone_path,
    username,
    password,
    endpoint,
    service_name,
    extra_args,
    update,
  });

  closeForm();
}

function reset_rclone_path() {
  rclone_path = "";
  rclone_path_txt.style.display = "none";
}

function remove_rclone(service_name) {
  if (service_name in services) {
    delete services[service_name];

    const service_row = document.getElementById(service_name);
    if (service_row) {
      services_table_body.removeChild(service_row);
    }
  }
}

IPCRenderer.on("rclone:toggled", (e, data) => {
  const service_name = data.service_name;
  const status = data.status;

  const rows = services_table.rows;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.id === service_name) {
      const i_tag = row.querySelector("i");

      i_tag.classList = status
        ? "fas fa-circle text-blue"
        : "fas fa-circle text-red";
      i_tag.innerText = status ? "running" : "stopped";
    }
  }

  services[data.service_name]["status"] = status;
});

IPCRenderer.on("rclone:created", (event, data) => {
  console.log(data.endpoint);
  new_service_row(data.service_name, data.endpoint, false);
});

IPCRenderer.on("rclone:removed", (event, data) => {
  remove_rclone(data.service_name);
});

IPCRenderer.on("error", (event, data) => {
  Toastify.toast({
    text: data.message,
    duration: 5000,
    close: false,
    stopOnFocus: true,
    style: {
      background: "red",
      color: "white",
      textAlign: "center",
      fontSize: "16px",
      padding: "8px",
    },
  });
});

IPCRenderer.on("info", (event, data) => {
  Toastify.toast({
    text: data.message,
    duration: 5000,
    close: false,
    stopOnFocus: true,
    style: {
      background: "green",
      color: "white",
      textAlign: "center",
      fontSize: "16px",
      padding: "8px",
    },
  });
});

IPCRenderer.on("rclone:path", (event, data) => {
  if (data.rclone_path) {
    rclone_path = data.rclone_path;
    rclone_path_txt.innerText = "Using Rclone: " + rclone_path;
    rclone_path_txt.style.display = "block";
  } else {
    console.log("rclone path provided but it's empty");
  }
});
