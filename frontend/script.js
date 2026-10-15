
const API_URL = "/api/tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-title");
const dueDateInput = document.getElementById("task-due-date");
const taskList = document.getElementById("task-list");
const message = document.getElementById("message");

let tasks = [];

function readStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
        return {};
    }
}

function saveStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getLocalDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

async function loadTasks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to load tasks.");
        }

        tasks = await response.json();

        const statuses = readStorage("taskStatuses");
        const dueDates = readStorage("taskDueDates");

        tasks.forEach(task => {
            if (
                Object.prototype.hasOwnProperty.call(statuses, task.id)
            ) {
                task.completed = statuses[task.id];
            }

            task.dueDate = dueDates[task.id] || "";
        });

        displayTasks();
    } catch {
        message.textContent = "Unable to load tasks. Check your server.";
    }
}

function displayTasks() {
    taskList.innerHTML = "";

    document.getElementById("task-count").textContent =
        `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`;

    document.getElementById("pending-count").textContent =
        tasks.filter(task => !task.completed).length;

    document.getElementById("completed-count").textContent =
        tasks.filter(task => task.completed).length;

    if (tasks.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-message";
        empty.textContent = "No tasks yet. Add your first task!";
        taskList.appendChild(empty);
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement("li");

        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title;

        if (task.completed) {
            title.classList.add("finished");
        }

        const status = document.createElement("span");
        status.className = "task-status";
        status.textContent = task.completed ? "Completed" : "Pending";
        status.classList.add(
            task.completed ? "completed" : "pending"
        );

        const dueDate = document.createElement("span");
        dueDate.className = "due-date";

        if (task.dueDate) {
            dueDate.textContent = `Due date: ${task.dueDate}`;

            if (!task.completed && task.dueDate < getLocalDate()) {
                dueDate.textContent += " — Overdue";
                dueDate.classList.add("overdue");
            }
        } else {
            dueDate.textContent = "No due date";
        }

        const completeButton = document.createElement("button");
        completeButton.className = "complete-button";
        completeButton.textContent = task.completed ? "Undo" : "Complete";

        completeButton.onclick = () => {
            task.completed = !task.completed;

            const statuses = readStorage("taskStatuses");
            statuses[task.id] = task.completed;
            saveStorage("taskStatuses", statuses);

            displayTasks();
        };

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.onclick = async () => {
            try {
                const response = await fetch(`${API_URL}/${task.id}`, {
                    method: "DELETE"
                });

                if (!response.ok) {
                    throw new Error("Unable to delete task.");
                }

                const statuses = readStorage("taskStatuses");
                const dueDates = readStorage("taskDueDates");

                delete statuses[task.id];
                delete dueDates[task.id];

                saveStorage("taskStatuses", statuses);
                saveStorage("taskDueDates", dueDates);

                message.textContent = "Task deleted successfully!";
                await loadTasks();
            } catch (error) {
                message.textContent = error.message;
            }
        };

        li.appendChild(title);
        li.appendChild(status);
        li.appendChild(completeButton);
        li.appendChild(deleteButton);
        li.appendChild(dueDate);

        taskList.appendChild(li);
    });
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = input.value.trim();
    const dueDate = dueDateInput.value;

    if (!title) {
        message.textContent = "Please enter a task name.";
        return;
    }

    if (!dueDate) {
        message.textContent = "Please select a due date.";
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: title })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to add task.");
        }

        const dueDates = readStorage("taskDueDates");
        dueDates[result.id] = dueDate;
        saveStorage("taskDueDates", dueDates);

        const statuses = readStorage("taskStatuses");
        delete statuses[result.id];
        saveStorage("taskStatuses", statuses);

        input.value = "";
        dueDateInput.value = "";

        message.textContent = "Task added successfully!";
        await loadTasks();
    } catch (error) {
        message.textContent = error.message;
    }
});

loadTasks();