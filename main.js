let NEWS_COUNT = 15;
let EDITING_NOTE_INDEX;
let NOTEPAD_FULLSCREEN = false;
let TODOS_FULLSCREEN = false;
const QUOTE_LENGHT_LIMIT = 165;
const COVID_DATA_TYPES = [{en: "cases", pl:"Zakażenia"}, {en: "deaths", pl: "Zgony"}];
let COVID_DISPLAYING_DATA_TYPE_INDEX = 0;
let EDITING_TODO_CATEGORY_INDEX;
const LOAD_OFFLINE = !navigator.onLine;
const COVID_TIMELINE_LIMIT = 21;

const daysOfWeek = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "paźdźiernika", "listopada", "grudnia"];

let menuTypes = {
    notepadCategory: {
        selector: '.notepadCategoryMore',
        trigger: 'left',
        build: function($trigger){
            let index = $trigger[0].dataset.index;
            let options = {
                items: {
                    delete: {
                        name: "Usuń",
                        isHtmlName: false,
                        callback: (itemKey, opt)=>{
                            showHideConfirmation("show", getOffset(opt.$menu[0]), ()=>{
                                deleteNotepadCategory(index);
                            });
                        }
                    },
                    edit: {
                        name: "Zmień nazwę",
                        type: "text",
                        value: notes[EDITING_NOTE_INDEX].title,
                        events: {
                            keydown: (e)=>{
                                if(e.keyCode == 13){
                                    let value = e.currentTarget.value;
                                    editNotepadCategory(index, value);
                                    $('.context-menu-list').trigger('contextmenu:hide');
                                }
                            }
                        }
                    }
                } 
            }
            return options;
        }
    },
    todoCategory: {
        selector: '.todoCategoryMore',
        trigger: 'left',
        build: function($trigger){
            let index = $trigger[0].dataset.index;
            let options = {
                items: {
                    delete: {
                        name: "Usuń",
                        isHtmlName: false,
                        callback: (itemKey, opt)=>{
                            showHideConfirmation("show", getOffset(opt.$menu[0]), ()=>{
                                deleteTodoCategory(index);
                            });
                        }
                    },
                    edit: {
                        name: "Zmień nazwę",
                        type: "text",
                        value: todos[EDITING_TODO_CATEGORY_INDEX].title,
                        events: {
                            keydown: (e)=>{
                                if(e.keyCode == 13){
                                    let value = e.currentTarget.value;
                                    editTodoCategory(index, value);
                                    $('.context-menu-list').trigger('contextmenu:hide');
                                }
                            }
                        }
                    }
                } 
            }
            return options;
        }
    },
    todo: {
        selector: '.todoMore',
        trigger: 'left',
        build: function($trigger){
            let index = $trigger[0].dataset.index;
            let options = {
                items: {
                    delete: {
                        name: "Usuń",
                        isHtmlName: false,
                        callback: ()=>{
                            deleteTodo(index);
                        }
                    },
                    markAsImportant: {
                        name: (todos[EDITING_TODO_CATEGORY_INDEX].todos[index].important) ? "Anuluj priorytet" : "Dodaj priorytet",
                        isHtmlName: false,
                        callback: ()=>{
                            toggleTodoImportant(index);
                        }
                    },
                    edit: {
                        name: "Zmień treść",
                        type: "text",
                        value: todos[EDITING_TODO_CATEGORY_INDEX].todos[index].description,
                        events: {
                            keydown: (e)=>{
                                if(e.keyCode == 13){
                                    let value = e.currentTarget.value;
                                    editTodo(index, value);
                                    $('.context-menu-list').trigger('contextmenu:hide');
                                }
                            }
                        }
                    }
                }
            }
            return options;
        }
    }
}

let settings = {
    weatherCity: "elblag"
}
let articles = [];
let todos = [];
let quotes = [];
let currentQuote;
let calculatorOperation = "";
let notes = [];
let covidChart;

/* --------------------------------------HELP FUNCTIONS----------------------------------------------------------------- */
Date.prototype.formatTime = (function(showSeconds=true){
    let date = new Date(this);
    let hours = (date.getHours() < 10) ? "0" + date.getHours() : date.getHours();
    let minutes = (date.getMinutes() < 10) ? "0" + date.getMinutes() : date.getMinutes();
    let seconds = (date.getSeconds() < 10) ? "0" + date.getSeconds() : date.getSeconds();
    if(showSeconds) return hours + ":" + minutes + ":" + seconds;
    else return hours + ":" + minutes;
});
function setInputWith(element, elementMin=0, elementMax=999, container){
    let hideSpan = document.createElement("div");
    hideSpan.style.padding = getComputedStyle(element).padding;
    hideSpan.style.fontSize = getComputedStyle(element).fontSize;
    hideSpan.className = "autoWidthHide";
    hideSpan.textContent = element.value;
    document.body.appendChild(hideSpan);
    let w = hideSpan.offsetWidth;
    document.body.removeChild(hideSpan);

    if(container){
        container.style.width = `calc(100% - ${w}px)`;
    }

    if(w>elementMax) w=elementMax;
    if(w<elementMin) w=elementMin;
    element.style.width = w+"px";
}
function runOnlineWidgets(){
    getArticles();
    setWeatherCity();
    getRandomQuote();
    showCovidChart();
    showHideOnlineQuoteOptions("show");
}
function stripHTML(html){
    return html.replace(/<[^>]*>?/gm, '');
}
function isHiddenElement(el){
    let style = window.getComputedStyle(el);
    return (style.display === "none");
}
HTMLElement.prototype.changeEventListener = function(type, newCallback){
    let newElement = this.cloneNode(true);
    newElement.addEventListener(type, newCallback);
    this.parentNode.replaceChild(newElement, this);
}
function shortNumber(num, digits){
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" }
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var item = lookup.slice().reverse().find(function(item) {
      return num >= item.value;
    });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}
function getOffset(el) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return {top: _y, left: _x};
}

/* --------------------------------------CLASSES----------------------------------------------------------------- */
class Writer{
    constructor(text, container, speed=50){
        this.text = text;
        this.iteration = 0;
        this.speed = speed;
        this.container = container;
    }
    write(){
        if(this.iteration < this.text.length){
            this.container.innerHTML += this.text.charAt(this.iteration);
            this.iteration += 1;
            setTimeout(() => {
                this.write();
            }, 60);
        }
    }
}
class Article{
    constructor(item){
        this.title = item.querySelector("title").innerHTML.replace("<![CDATA[", "").replace("]]>", "").replaceAll("&quot;", '"');
        this.description = stripHTML(item.querySelector("description").innerHTML.replace("<![CDATA[", "").replace("]]>", "")).replaceAll("&quot;", '"');
    }
    createArticleDomElement(){
        var container = document.createElement("article");
        container.className = "article";
        var articleTitle = document.createElement("h3");
        articleTitle.className = "articleTitle";
        articleTitle.innerText = this.title;
        container.appendChild(articleTitle);
        var articleDescription = document.createElement("p");
        articleDescription.className = "articleDescription";
        articleDescription.innerText = this.description;
        container.appendChild(articleDescription);
        return container;
    }
}
class NotepadCategory{
    constructor(title, value, index){
        this.title = title;
        this.value = value;
        this.index = index;
    }
    createCategoryBox(){
        let categoryContainer = document.createElement("li");
        categoryContainer.className = "notepadCategory";
        categoryContainer.dataset.index = this.index;
        categoryContainer.addEventListener('click', (e)=>{
            if(!moreButton.contains(e.target)) changeNotepadCategory(this.index);
        });
        let titleBox = document.createElement("div");
        titleBox.className = "notepadCategoryTitle";
        titleBox.textContent = this.title;
        categoryContainer.appendChild(titleBox);
        let moreButton = document.createElement("button");
        moreButton.dataset.index = this.index;
        moreButton.className = "notepadCategoryMore";
        moreButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 18c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"/></svg>';
        categoryContainer.appendChild(moreButton);
        return categoryContainer;
    }
}
class Quote{
    constructor(content, author, tags, id=null){
        this.content = content;
        this.author = author;
        this.tag = tags;
        this.id = id;
    }
    showCurrentQuote(){
        document.querySelector("#quoteContent").textContent = this.content;
        document.querySelector("#quoteAuthor").textContent = this.author;
    }
    createQuoteSaveBox(){
        let container = document.createElement("div");
        container.className = "savedQuote";
        let content = document.createElement("div");
        content.className = "savedQuoteContent";
        content.textContent = `„${this.content}”`;
        let author = document.createElement("div");
        author.className = "savedQuoteAuthor";
        author.textContent = this.author;
        content.appendChild(author);
        container.appendChild(content);
        let deleteButton = document.createElement("button");
        deleteButton.className = "savedQuotesDelete";
        deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.315c0 .901.73 2 1.631 2h5.712z"/></svg>';
        deleteButton.dataset.id = this.id;
        deleteButton.addEventListener("click", ()=>{
            deleteSavedQuote(this.id);
        });
        container.appendChild(deleteButton);
        return container;
    }
}
class ConsoleLog{
    constructor(message, type){
        this.type = type;
        this.message = message;
    }
    display(){
        let today = new Date();
        let time = today.formatTime();
                
        let container = document.querySelector("#consoleLogs");
        let log = document.createElement("span");
        log.classList.add("log", this.type);
        log.innerHTML = time + ": " + this.message;
        container.insertBefore(log, container.firstChild);
    }
}
class Todo{
    constructor(description, checked, important, index){
        this.description = description;
        this.checked = checked;
        this.important = important;

        this.index = index;
        this.order = this.index;
    }
    createTodoBox(){
        let container = document.createElement("label");
        container.className = (this.important) ? "todo important" : "todo";
        container.dataset.index = this.index;
        let descriptionBox = document.createElement("div");
        descriptionBox.className = "todoDescription";
        descriptionBox.innerHTML = this.description;
        container.appendChild(descriptionBox);
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todoCheckbox";
        checkbox.checked = this.checked;
        checkbox.dataset.index = this.index;
        checkbox.addEventListener("click", ()=>{
            toggleTodoCheck(this.index);
        });
        container.appendChild(checkbox);
        let moreButton = document.createElement("button");
        moreButton.dataset.index = this.index;
        moreButton.className = "todoMore";
        moreButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 18c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"/></svg>';
        container.appendChild(moreButton);
        return container;
    }
}
class TodoCategory{
    constructor(title, todos, index){
        this.title = title;
        this.todos = todos;
        this.index = index;
    }
    createCategoryBox(){
        let categoryContainer = document.createElement("li");
        categoryContainer.className = "todoCategory";
        categoryContainer.dataset.index = this.index;
        categoryContainer.addEventListener('click', (e)=>{
            if(!moreButton.contains(e.target)) changeTodoCategory(this.index);
        });
        let titleBox = document.createElement("div");
        titleBox.className = "todoCategoryTitle";
        titleBox.textContent = this.title;
        categoryContainer.appendChild(titleBox);
        let moreButton = document.createElement("button");
        moreButton.dataset.index = this.index;
        moreButton.className = "todoCategoryMore";
        moreButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 18c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"/></svg>';
        categoryContainer.appendChild(moreButton);
        return categoryContainer;
    }
    createTodoBoxes(){
        let boxes = [];
        let filteredTodos = this.todos.filter(element => element != null);
        filteredTodos.sort((a, b) => a.order - b.order);
        filteredTodos.forEach((todo)=>{
            if(todo){
                boxes.push(todo.createTodoBox());
            }
        });
        return boxes;
    }
}

/* --------------------------------------SETUP----------------------------------------------------------------- */
function saveSettings(){
    window.localStorage.setItem("settings", JSON.stringify(settings));
}
function loadSettings(){
    if(window.localStorage.getItem("settings") != null) settings = JSON.parse(window.localStorage.getItem("settings"));
    document.querySelector("#weatherCityInput").value = settings.weatherCity;
}
function typeWriter(text, container){
    let writer = new Writer(text, container);
    writer.write();
}
function showHideConfirmation(mode, offset, confirmCallback){
    if(mode == "show"){
        document.querySelector("#confirmation").style.top = `${offset.top}px`;
        document.querySelector("#confirmation").style.left = `${offset.left}px`;

        document.querySelector("#confirmation").style.display = "flex";
        document.querySelector("#contifirmationConfirm").changeEventListener("click", ()=>{
            confirmCallback();
            showHideConfirmation("hide");
        });
    }else{
        document.querySelector("#confirmation").style.display = "none";
    }
}
document.querySelector("#contifirmationCancel").addEventListener("click", ()=>{
    showHideConfirmation("hide");
});

/* --------------------------------------ARTICLES----------------------------------------------------------------- */
function getArticles(){
    var requester = new XMLHttpRequest();
    requester.open("GET", "https://www.rmf24.pl/fakty/swiat/feed");
    requester.onreadystatechange = ()=>{
        if(requester.readyState == 4 && requester.status == 200){
            let XML = requester.responseXML;
            let articlesContainer = document.querySelector("#articlesList");
            articlesContainer.innerHTML = "";
            for(let i=0; i<XML.querySelectorAll("item").length; i++){
                let item = XML.querySelectorAll("item")[i];
                let article = new Article(item);
                articles.push(article);
            }
            for(let i=0; i<NEWS_COUNT; i++){
                articlesContainer.appendChild(articles[i].createArticleDomElement());
            }
            consoleLog("Pomyślnie załadowano wiadomości.")
        }
        if(requester.status != 200){
            consoleLog("Wystąpił błąd podczas ładowania wiadomości.", "error");
        }
    }
    requester.send(null);
}

function showMoreArticles(){
    let articlesContainer = document.querySelector("#articlesList");
    for(let i=NEWS_COUNT; i<NEWS_COUNT+5; i++){
        if(articles[i] != undefined){
            articlesContainer.appendChild(articles[i].createArticleDomElement());
        }
    }
    NEWS_COUNT += 5;
    consoleLog("Wczytano więcej wiadomości.")
}
document.querySelector("#showMoreArticles").addEventListener("click", ()=>{
    showMoreArticles();
});

/* ---------------------------WEATHER------------------------------ */
function setWeatherCity(city = settings.weatherCity){
    if(!window.navigator.onLine || city == ""){
        document.querySelector("#weatherCityInput").value = settings.weatherCity;
        return;
    }

    settings.weatherCity = city;
    $.getJSON(`https://api.openweathermap.org/data/2.5/weather?q=${city}&lang=pl&units=metric&appid=0b021e89d059437a56f5b4fbcea13713`, (data, status)=>{
        if(status == "success"){
            let sunsetDate = new Date(data.sys.sunset * 1000);

            document.querySelector("#weatherIcon").src = `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            document.querySelector("#weatherTemperature").innerText =  Math.round(data.main.temp) + "°";
            document.querySelector(".weatherMoreBoxValue#feelsLike").innerText = Math.round(data.main.feels_like * 10) / 10 + "°";
            document.querySelector(".weatherMoreBoxValue#pressure").innerText = data.main.pressure;
            document.querySelector(".weatherMoreBoxValue#clouds").innerText = data.clouds.all + "%";
            document.querySelector(".weatherMoreBoxValue#sunset").innerText = sunsetDate.formatTime(false);
            document.querySelector("#weatherDescription").innerText = data.weather[0].description;


        }
    });
    saveSettings();
    consoleLog("Ustawiono lokalizację pogody.")
}
document.querySelector("#weatherCityButton").addEventListener("click", ()=>{
    setWeatherCity(document.querySelector("#weatherCityInput").value);
});

/* ---------------------------TODOS------------------------------ */
$("#todosCategories").sortable({
    items: '.todoCategory',
    cursor: "grabbing",
    containment: "#todosMenu",
    axis: "x",
    start: ()=>{
        $("#todosCategories").addClass("changing");
    },
    stop: ()=>{
        $("#todosCategories").removeClass("changing");
    },
    update: function(){
        saveTodos();
    }
});
$.contextMenu(menuTypes["todoCategory"]);

function saveTodos(){
    let newTodoCategories = [];
    let oldTodoCategoriesIndexes = $("#todosCategories").sortable('toArray', {attribute: 'data-index'});

    //Sort inner todos
    let todosClone = todos.map(a => {return {...a}});
    todosClone.forEach((category)=>{
        if(Object.entries(category).length){
            category['todos'] = category['todos'].filter(element => element != null);
            category['todos'].sort((a, b) => a.order - b.order);
        }
    });

    //Sort categories
    oldTodoCategoriesIndexes.forEach((dataIndex, i)=>{
        let newTodoCategory = new TodoCategory(
            todosClone[dataIndex].title,
            todosClone[dataIndex].todos,
            i
        );
        newTodoCategories.push(newTodoCategory);
    });

    localStorage.setItem("todos", JSON.stringify(newTodoCategories));
}
function loadTodos(){
    let loadValue = [];
    if(window.localStorage.getItem("todos")){
        loadValue = JSON.parse(window.localStorage.getItem("todos"));
    }
    loadValue.forEach((category, i)=>{
        category.todos.forEach((todo, i)=>{
            let newTodo = new Todo(todo.description, todo.checked, todo.important, i);
            category.todos[i] = newTodo;
        });
        let todoCategory = new TodoCategory(category.title, category.todos, i);
        todos.push(todoCategory);
        document.querySelector("#todosCategories").appendChild(todoCategory.createCategoryBox());
    })
    if(todos.length > 0){
        changeTodoCategory(0);
        showHideTodosEmpty("hide");
    }
    consoleLog("Pomyślnie załadowano Todos.")
}

function showHideTodoCategoryForm(mode){
    if(mode == "show"){
        document.querySelector("#todosEmpty").style.display = "none";
        document.querySelector("#addTodoCategoryForm").style.display = "block";
        document.querySelector("#showAddTodoCategoryForm").style.display = "none";
        document.querySelector("#addTodoCategoryText").focus();
        showHideTodosEmpty("hide");
    }else{
        document.querySelector("#addTodoCategoryForm").style.display = "none";
        document.querySelector("#showAddTodoCategoryForm").style.display = "block";
        document.querySelector("#addTodoCategoryText").value = "";
        document.querySelector("#todosCategories").style.width = "100%";
        document.querySelector("#addTodoCategoryText").style.width = "60px";
        showHideTodosEmpty("auto");
    }
}
document.querySelector("#showAddTodoCategoryForm").addEventListener("click", ()=>{
    showHideTodoCategoryForm("show");
});
document.querySelector("#todosEmptyButton").addEventListener("click", ()=>{
    showHideTodoCategoryForm("show");
});
document.querySelector("#addTodoCategoryText").addEventListener('focusout', ()=>{
    showHideTodoCategoryForm("hide");
});

function addTodoCategory(){
    let index = todos.length;
    let title = document.querySelector("#addTodoCategoryText").value;
    if(title != ""){
        let todoCategory = new TodoCategory(title, [], index);
        todos.push(todoCategory);
        document.querySelector("#todosCategories").appendChild(todoCategory.createCategoryBox());
    
        changeTodoCategory(index);
        saveTodos();
    }
    showHideTodoCategoryForm("hide");
    consoleLog("Dodano nową kategorię Todo.")
}
document.querySelector("#addTodoCategoryButton").addEventListener("click", ()=>{
    addTodoCategory();
});
document.querySelector("#todosMenu").addEventListener("dblclick", (e)=>{
    showHideTodoCategoryForm("show");
});
document.querySelector("#addTodoCategoryText").addEventListener("keydown", function(e){
    if(e.which == 13) addTodoCategory();
});
document.querySelector("#addTodoCategoryText").addEventListener("input", function(){
    setInputWith(this, 60, 200, document.querySelector("#todosCategories"));
});

function deleteTodoCategory(index){
    document.querySelector(`.todoCategory[data-index='${index}']`).remove();
    todos[index] = null;

    const changeCategoryIndex = todos.indexOf(todos.find(el => el !== null));
    if(changeCategoryIndex > -1){
        changeTodoCategory(changeCategoryIndex);
    }else{
        document.querySelector("#todosList").innerHTML = "";
        showHideTodosEmpty("show");
    }
    
    saveTodos();
    consoleLog("Usunięto kategorię Todo.")
}

function editTodoCategory(index, value){
    if(value){
        todos[index].title = value;
        document.querySelector(`.todoCategory[data-index='${index}'] .todoCategoryTitle`).innerHTML = value;
        saveTodos();
    }
}

function changeTodoCategory(index){
    document.querySelectorAll(".todoCategory").forEach(function(item) {
        item.classList.remove("active");
    });
    EDITING_TODO_CATEGORY_INDEX = index;    

    let categoryBox = document.querySelector(`.todoCategory[data-index='${index}']`);
    categoryBox.classList.add("active");

    $("#todosList").find(".todo").remove();
    let todoBoxes = todos[EDITING_TODO_CATEGORY_INDEX].createTodoBoxes();
    todoBoxes.forEach((todo)=>{
        document.querySelector("#todosList").insertBefore(todo, document.querySelector("#addTodoForm"));
    });

    setTodosFullscreenIcon();
}
function todosFullscreen(mode){
    if(mode == "show" || (mode == "toggle" && TODOS_FULLSCREEN == false)){
        TODOS_FULLSCREEN = true;
        document.querySelector("#todos").classList.add("fullscreen");
        $("#todosList").sortable( "option", "axis", false);
        consoleLog("Przełączono Todos na tryb pełnoekranowy.");
    }else if(mode == "hide" || (mode == "toggle" && TODOS_FULLSCREEN == true)){
        TODOS_FULLSCREEN = false;
        document.querySelector("#todos").classList.remove("fullscreen");
        $("#todosList").sortable( "option", "axis", "y");
    }
    setTodosFullscreenIcon();   
}
document.querySelector("#todosFullscreenButton").addEventListener("click", ()=>{
    todosFullscreen("toggle");
});

function setTodosFullscreenIcon(){
    let todosCount = todos.filter(element => element != null).length;
    let visibleTodosCount = [...document.querySelectorAll(".todoCategory")].filter(element => !isHiddenElement(element)).length;

    if(todosCount > 3 && visibleTodosCount == 3 && TODOS_FULLSCREEN == false){
        document.querySelector("#todosFullscreenButton svg path").setAttribute("d", "M6 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm9 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm9 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z");
    }else if((todosCount <= 3 && TODOS_FULLSCREEN == false) || (visibleTodosCount == 4 && TODOS_FULLSCREEN == false)){
        document.querySelector("#todosFullscreenButton svg path").setAttribute("d", "M21.414 18.586l2.586-2.586v8h-8l2.586-2.586-5.172-5.172 2.828-2.828 5.172 5.172zm-13.656-8l2.828-2.828-5.172-5.172 2.586-2.586h-8v8l2.586-2.586 5.172 5.172zm10.828-8l-2.586-2.586h8v8l-2.586-2.586-5.172 5.172-2.828-2.828 5.172-5.172zm-8 13.656l-2.828-2.828-5.172 5.172-2.586-2.586v8h8l-2.586-2.586 5.172-5.172z");
    }else if(TODOS_FULLSCREEN == true){
        document.querySelector("#todosFullscreenButton svg path").setAttribute("d", "M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z");
    }
}

$("#todosList").sortable({
    items: '.todo',
    cursor: "grabbing",
    containment: "#todosContainer",
    tolerance: "pointer",
    axis: "y",
    start: (e, ui)=>{
        $("#todosList").addClass("changing");
        ui.item.css("box-shadow", "0 0 8px 5px #141414");
        ui.placeholder.height(ui.item.height());

        ui.placeholder.css('opacity', '0.55');
        ui.placeholder.css('visibility', 'visible');
    },
    stop: (e, ui)=>{
        ui.item.css("box-shadow", "unset");
        $("#todosList").removeClass("changing");
    },
    update: function(){
        //Po sortowaniu przypisz rzeczywisty index dla każdego todo
        let realTodosIndexes = $("#todosList").sortable('toArray', {attribute: 'data-index'});
        realTodosIndexes.forEach((dataIndex, i)=>{
            todos[EDITING_TODO_CATEGORY_INDEX]['todos'][dataIndex].order = i;
        });
        saveTodos();
    }
});
$.contextMenu(menuTypes["todo"]);

function showHideTodosEmpty(mode){
    if(mode == "show"){
        document.querySelector("#todosEmpty").style.display = "flex";
    }else if(mode == "hide"){
        document.querySelector("#todosEmpty").style.display = "none";
    }else if(mode == "auto"){
        if(todos.indexOf(todos.find(el => el !== null)) == -1){
            document.querySelector("#todosEmpty").style.display = "flex";
        }else{
            document.querySelector("#todosEmpty").style.display = "none";
        }
    }
}

function addTodo(){
    let index = todos[EDITING_TODO_CATEGORY_INDEX]["todos"].length;
    let description = document.querySelector("#addTodoFormText").value;
    if(description){
        let todo = new Todo(description, false, false, index);
        todos[EDITING_TODO_CATEGORY_INDEX].todos.push(todo);
        document.querySelector("#todosList").insertBefore(todo.createTodoBox(), document.querySelector("#addTodoForm"));
        $('#todosContainer').animate({
            scrollTop: $("#todosContainer").offset().top
        }, 700);

        document.querySelector("#addTodoFormText").value = "";
    
        saveTodos();
    }
}
document.querySelector("#addTodoButton").addEventListener("click", addTodo);
document.querySelector("#addTodoFormText").addEventListener("keydown", function(e){
    if(e.which == 13) addTodo();
});

function deleteTodo(index){
    document.querySelector(`.todo[data-index='${index}']`).remove();
    todos[EDITING_TODO_CATEGORY_INDEX].todos[index] = null;

    saveTodos();
    consoleLog("Usunięto Todo.")
}

function toggleTodoImportant(index){
    if(todos[EDITING_TODO_CATEGORY_INDEX].todos[index].important){
        todos[EDITING_TODO_CATEGORY_INDEX].todos[index].important = false;   
    }else{
        todos[EDITING_TODO_CATEGORY_INDEX].todos[index].important = true;
    }

    document.querySelector(`.todo[data-index='${index}']`).classList.toggle("important");
    saveTodos();
}

function editTodo(index, value){
    if(value){
        todos[EDITING_TODO_CATEGORY_INDEX].todos[index].description = value;
        document.querySelector(`.todo[data-index='${index}'] .todoDescription`).innerHTML = value;
        saveTodos();
    }
}

function toggleTodoCheck(index){
    let isChecked = document.querySelector(`.todoCheckbox[data-index='${index}']`).checked;
    todos[EDITING_TODO_CATEGORY_INDEX].todos[index].checked = isChecked;
    saveTodos();
}

/* ---------------------------QUOTES------------------------------ */
function saveQuotes(){
    localStorage.setItem("quotes", JSON.stringify(quotes));
}
function loadSavedQuotes(){
    let loadValue = [];
    if(localStorage.getItem("quotes")){
        loadValue = JSON.parse(localStorage.getItem("quotes"));
        for(let i=0; i<loadValue.length; i++){
            let quote = new Quote(loadValue[i].content, loadValue[i].author, loadValue[i].tag, i);
            quotes.push(quote);
        }
    }
}

function getRandomQuote(){
    $.getJSON(`https://quotable.io/random?maxLength=${QUOTE_LENGHT_LIMIT}`, (data, status)=>{
        if(status == "success"){
            currentQuote = new Quote(data.content, data.author, data.tags);
            currentQuote.showCurrentQuote();
            consoleLog("Pomyślnie załadowano cytat.");    
        }else{
            consoleLog("Wystąpił błąd podczas pobierania cytatu.", "error");
        }
    });
}

document.querySelector("#refreshQuote").addEventListener("click", ()=>{
    getRandomQuote();
    document.querySelector("#saveQuote svg path").setAttribute("d", "M12 5.173l2.335 4.817 5.305.732-3.861 3.71.942 5.27-4.721-2.524-4.721 2.525.942-5.27-3.861-3.71 5.305-.733 2.335-4.817zm0-4.586l-3.668 7.568-8.332 1.151 6.064 5.828-1.48 8.279 7.416-3.967 7.416 3.966-1.48-8.279 6.064-5.827-8.332-1.15-3.668-7.569z");
});

function showHideSavedQuotes(mode){
    if(mode == "show"){
        document.querySelector("#widgetsContainer").style.filter = "blur(2px)";
        document.querySelector("#savedQuotes").style.display = "flex";
        showHideQuotesEmpty("auto");
        generateSavedQuotes();
    }else{
        document.querySelector("#widgetsContainer").style.filter = "unset";
        document.querySelector("#savedQuotes").style.display = "none";
    }
}
function showHideQuotesEmpty(mode){
    if(mode == "show"){
        document.querySelector("#savedQuotesEmpty").style.display = "flex";
    }else if(mode == "hide"){
        document.querySelector("#savedQuotesEmpty").style.display = "none";
    }else{
        if(quotes.length == 0) showHideQuotesEmpty("show");
        else showHideQuotesEmpty("hide");
    }
}
function showHideOnlineQuoteOptions(mode){
    if(mode == "show"){
        document.querySelector("#refreshQuote").style.display = "block";
        document.querySelector("#saveQuote").style.display = "block";
    }else{
        document.querySelector("#refreshQuote").style.display = "none";
        document.querySelector("#saveQuote").style.display = "none";
    }
}
document.querySelector("#showSavedQuotes").addEventListener("click", ()=>{
    showHideSavedQuotes("show");
});
document.querySelector("#hideSavedQuotes").addEventListener("click", ()=>{
    showHideSavedQuotes("hide");
});

function toggleCurrentQuoteSave(){
    if(quotes.indexOf(currentQuote) == -1){
        currentQuote.id = quotes.length;
        quotes.push(currentQuote);
        document.querySelector("#saveQuote svg path").setAttribute("d", "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z");
        consoleLog("Dodano cytat do ulubionych");
    }else{
        const index = quotes.indexOf(currentQuote);
        quotes.splice(index, 1);
        document.querySelector("#saveQuote svg path").setAttribute("d", "M12 5.173l2.335 4.817 5.305.732-3.861 3.71.942 5.27-4.721-2.524-4.721 2.525.942-5.27-3.861-3.71 5.305-.733 2.335-4.817zm0-4.586l-3.668 7.568-8.332 1.151 6.064 5.828-1.48 8.279 7.416-3.967 7.416 3.966-1.48-8.279 6.064-5.827-8.332-1.15-3.668-7.569z");
        consoleLog("Usunięto cytat z ulubionych");
    }
    showHideQuotesEmpty("auto");
    generateSavedQuotes();
    saveQuotes();
}
document.querySelector("#saveQuote").addEventListener("click", ()=>{
    toggleCurrentQuoteSave();
});

function deleteSavedQuote(id){
    document.querySelector(`.savedQuotesDelete[data-id='${id}']`).closest(".savedQuote").remove();
    const index = quotes.findIndex(object => {
        return object.id == id;
    });
    if(quotes[index] == currentQuote){
        toggleCurrentQuoteSave();
    }
    quotes.splice(index, 1);
    showHideQuotesEmpty("auto");
    saveQuotes();
    consoleLog("Usunięto cytat z ulubionych");
}

function generateSavedQuotes(){
    document.querySelector("#savedQuotesList").innerHTML = "";
    if(quotes.length == 0) return;
    for(let i=0; i<quotes.length; i++){
        document.querySelector("#savedQuotesList").appendChild(quotes[i].createQuoteSaveBox());
    }
}

/* ---------------------------CALCULATOR------------------------------ */
function calculatorResult(){
    let value = calculatorOperation.replace(/[^-()\d/*+.]/g, '');
    if(!isNaN(parseInt(value.charAt(value.length-1)))){
        document.querySelector("#calculatorResult").textContent = Math.round(eval(value) * 100) / 100;
        calculatorOperation = (Math.round(eval(value) * 100) / 100).toString();
    }
}
function operateCalculatorButton(char){
    function displayOperation(){
        let displayValue = calculatorOperation || 0;
        document.querySelector("#calculatorResult").textContent = displayValue;
    }

    if(char == "clear"){
        calculatorOperation = "";
        displayOperation();
        return
    };
    if(char == "back"){
        calculatorOperation = calculatorOperation.slice(0, -1);
        displayOperation();
        return
    };
    if(char == "result"){
        calculatorResult();
        return
    };

    if(isNaN(calculatorOperation.charAt(calculatorOperation.length-1)) && isNaN(char)){
        calculatorOperation = calculatorOperation.slice(0, -1);
    }
    calculatorOperation += char;
    displayOperation();
}
document.querySelectorAll(".calculatorButton").forEach(element => element.addEventListener("click", ()=>{
    operateCalculatorButton(element.dataset.value);
}));
document.body.addEventListener("keyup", (e)=>{
    if(document.activeElement.tagName != "INPUT" && document.activeElement.tagName != "TEXTAREA"){
        if(e.keyCode == 46){
            operateCalculatorButton("clear");
        }else if(e.keyCode == 8){
            operateCalculatorButton("back");
        }else if(e.keyCode == 13){
            operateCalculatorButton("result");
        }else if(e.keyCode == 110 || e.keyCode == 188 || e.keyCode == 190){
            operateCalculatorButton(".");
        }else if(e.keyCode == 49 || e.keyCode == 50 || e.keyCode == 51 || e.keyCode == 52 || e.keyCode == 53 || e.keyCode == 54 || e.keyCode == 55 || e.keyCode == 56 || e.keyCode == 57 || e.keyCode == 48 || e.keyCode == 96 || e.keyCode == 97 || e.keyCode == 98 || e.keyCode == 99 || e.keyCode == 100 || e.keyCode == 101 || e.keyCode == 102 || e.keyCode == 103 || e.keyCode == 104 || e.keyCode == 105 || e.keyCode === 189 || e.keyCode == 109 || e.keyCode == 106 || e.keyCode == 111 || e.keyCode == 191 || e.keyCode === 187 && e.shiftKey || e.keyCode == 107){
            operateCalculatorButton(e.key);
        }
    }
});

/* ---------------------------CONSOLE------------------------------ */
function consoleLog(message, type="info"){
    let log = new ConsoleLog(message, type);
    log.display();
}

/* ------------------------------------------COVID------------------------------------------------- */
function showCovidChart(type=COVID_DATA_TYPES[COVID_DISPLAYING_DATA_TYPE_INDEX].en){
    $.getJSON(`https://disease.sh/v3/covid-19/historical/Poland?lastdays=${COVID_TIMELINE_LIMIT}`, function (response) {
        data = {
            datasets: [{
                backgroundColor: '#666666',
                hoverBackgroundColor: "#888888",
                borderColor: '#666666',
                data: response.timeline[type]
            }]
        };
        config = {
            type: 'bar',
            data: data,
            options: {
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: "#222222"
                        },
                        ticks: {
                            color: "white",
                            callback: function(value, index, values){
                                return shortNumber(value, 1);
                            }
                        }
                    },
                    x: {
                        display: false
                    }
                },
                plugins:{   
                    legend: {
                        display: false
                    }
                }
            }
        };

        if(covidChart) covidChart.destroy();
        covidChart = new Chart(
            document.getElementById('covidChartCanvas'),
            config
        );

        let daily = {
            cases: Object.values(response.timeline.cases).at(-1) - Object.values(response.timeline.cases).at(-2),
            deaths: Object.values(response.timeline.deaths).at(-1) - Object.values(response.timeline.deaths).at(-2)
        };

        document.querySelector(".covidDataBox#cases").innerHTML = `Zakażenia <br> ${Object.values(response.timeline.cases).at(-1)}<br>(+${daily.cases})`;
        document.querySelector(".covidDataBox#deaths").innerHTML = `Zgony <br> ${Object.values(response.timeline.deaths).at(-1)}<br>(+${daily.deaths})`;
    });
}
function changeCovidDisplayingDataType(mode){
    if(COVID_DISPLAYING_DATA_TYPE_INDEX == COVID_DATA_TYPES.length - 1 && mode == "next") COVID_DISPLAYING_DATA_TYPE_INDEX = 0;
    else if(COVID_DISPLAYING_DATA_TYPE_INDEX == 0 && mode == "prev") COVID_DISPLAYING_DATA_TYPE_INDEX = COVID_DATA_TYPES.length-1;
    else (mode == "prev") ? COVID_DISPLAYING_DATA_TYPE_INDEX -= 1 : COVID_DISPLAYING_DATA_TYPE_INDEX += 1;

    document.querySelector("#covidControlsText").innerHTML = COVID_DATA_TYPES[COVID_DISPLAYING_DATA_TYPE_INDEX].pl;
    showCovidChart(COVID_DATA_TYPES[COVID_DISPLAYING_DATA_TYPE_INDEX].en);
}
document.querySelector(".covidControlsButton#previous").addEventListener("click", ()=>{
    changeCovidDisplayingDataType("prev");
});
document.querySelector(".covidControlsButton#next").addEventListener("click", ()=>{
    changeCovidDisplayingDataType("next");
});

/* -----------------------------------------CLOCK--------------------------------------------------- */
function showClockDate(){
    let date = new Date();
    let time = date.formatTime();
    let dateString = `${daysOfWeek[date.getDay()]}, ${('0' + date.getDate()).slice(-2)} ${months[date.getMonth()]} ${date.getFullYear()}`;
    document.querySelector("#clockTime").textContent = time;
    document.querySelector("#clockDate").textContent = dateString;
}
setInterval(() => {
    showClockDate();
}, 1000);

/* -----------------------------------------NOTEPAD--------------------------------------------------- */
$("#notepadCategories").sortable({
    items: '.notepadCategory',
    cursor: "grabbing",
    containment: "#notepadMenu",
    axis: "x",
    start: ()=>{
        $("#notepadCategories").addClass("changing");
    },
    stop: ()=>{
        $("#notepadCategories").removeClass("changing");
    },
    update: function(){
        saveNotepad();
    }
});
$.contextMenu(menuTypes["notepadCategory"]);

function saveNotepad(){
    let oldNotesIndexes = $("#notepadCategories").sortable('toArray', {attribute: 'data-index'});

    let newNotes = [];
    for(let i=0; i<oldNotesIndexes.length; i++){
        let newNotepadCategory = new NotepadCategory(
            notes[oldNotesIndexes[i]].title,
            notes[oldNotesIndexes[i]].value,
            i
        );
        newNotes.push(newNotepadCategory);
    }

    localStorage.setItem("notepad", JSON.stringify(newNotes));
}
function loadNotepad(){
    let loadValue = [];
    if(window.localStorage.getItem("notepad")){
        loadValue = JSON.parse(window.localStorage.getItem("notepad"));
    }
    for(let i=0; i<loadValue.length; i++){
        let notepadCategory = new NotepadCategory(loadValue[i].title, loadValue[i].value, i);
        notes.push(notepadCategory);
        document.querySelector("#notepadCategories").appendChild(notepadCategory.createCategoryBox());
    }
    if(notes.length > 0){
        changeNotepadCategory(0);
        showHideNotepadEmpty("hide");
    }
    consoleLog("Pomyślnie załadowano notatki.")
}

function addNotepadCategory(){
    let index = notes.length;
    let title = document.querySelector("#addNotepadCategoryText").value;
    if(title != ""){
        let notepadCategory = new NotepadCategory(title, "", index);
        notes.push(notepadCategory);
        document.querySelector("#notepadCategories").appendChild(notepadCategory.createCategoryBox());
    
        changeNotepadCategory(index);
        saveNotepad();
    }
    showHideNotepadCategoryForm("hide");
    consoleLog("Dodano nową notatkę.")
}
document.querySelector("#addNotepadCategoryButton").addEventListener("click", ()=>{
    addNotepadCategory();
});
document.querySelector("#notepadMenu").addEventListener("dblclick", (e)=>{
    showHideNotepadCategoryForm("show");
});
document.querySelector("#addNotepadCategoryText").addEventListener("keydown", function(e){
    if(e.which == 13) addNotepadCategory();
});
document.querySelector("#addNotepadCategoryText").addEventListener("input", function(){
    setInputWith(this, 60, 200, document.querySelector("#notepadCategories"));
});

function deleteNotepadCategory(index){
    document.querySelector(`.notepadCategory[data-index='${index}']`).remove();
    notes[index] = null;

    const changeCategoryIndex = notes.indexOf(notes.find(el => el !== null));
    if(changeCategoryIndex > -1){
        changeNotepadCategory(changeCategoryIndex);
    }else{
        document.querySelector("#notepadTextarea").value = "";
        showHideNotepadEmpty("show");
    }
    
    saveNotepad();
    consoleLog("Usunięto notatkę.")
}

function editNotepadCategory(index, value){
    if(value){
        notes[index].title = value;
        document.querySelector(`.notepadCategory[data-index='${index}'] .notepadCategoryTitle`).innerHTML = value;
        saveNotepad();
    }
}

function changeNotepadCategory(index){
    document.querySelectorAll(".notepadCategory").forEach(function(item) {
        item.classList.remove("active");
    });
    EDITING_NOTE_INDEX = index;    

    let categoryBox = document.querySelector(`.notepadCategory[data-index='${index}']`);
    categoryBox.classList.add("active");
    document.querySelector("#notepadTextarea").value = notes[index].value;

    setNotepadFullscreenIcon();
}

function showHideNotepadCategoryForm(mode){
    if(mode == "show"){
        document.querySelector("#notepadEmpty").style.display = "none";
        document.querySelector("#addNotepadCategoryForm").style.display = "block";
        document.querySelector("#showAddNotepadCategoryForm").style.display = "none";
        document.querySelector("#addNotepadCategoryText").focus();
        showHideNotepadEmpty("hide");
    }else{
        document.querySelector("#addNotepadCategoryForm").style.display = "none";
        document.querySelector("#showAddNotepadCategoryForm").style.display = "block";
        document.querySelector("#addNotepadCategoryText").value = "";
        document.querySelector("#notepadCategories").style.width = "100%";
        document.querySelector("#addNotepadCategoryText").style.width = "60px";
        showHideNotepadEmpty("auto");
    }
}

function showHideNotepadEmpty(mode){
    if(mode == "show"){
        document.querySelector("#notepadEmpty").style.display = "flex";
    }else if(mode == "hide"){
        document.querySelector("#notepadEmpty").style.display = "none";
    }else if(mode == "auto"){
        if(notes.indexOf(notes.find(el => el !== null)) == -1){
            document.querySelector("#notepadEmpty").style.display = "flex";
        }else{
            document.querySelector("#notepadEmpty").style.display = "none";
        }
    }
}
document.querySelector("#showAddNotepadCategoryForm").addEventListener("click", ()=>{
    showHideNotepadCategoryForm("show");
});
document.querySelector("#notepadEmptyButton").addEventListener("click", ()=>{
    showHideNotepadCategoryForm("show");
});
document.querySelector("#addNotepadCategoryText").addEventListener('focusout', ()=>{
    showHideNotepadCategoryForm("hide");
});

function notepadFullscreen(mode){
    if(mode == "show" || (mode == "toggle" && NOTEPAD_FULLSCREEN == false)){
        NOTEPAD_FULLSCREEN = true;
        document.querySelector("#notepad").classList.add("fullscreen");
        consoleLog("Przełączono notatkik na tryb pełnoekranowy.");
    }else if(mode == "hide" || (mode == "toggle" && NOTEPAD_FULLSCREEN == true)){
        NOTEPAD_FULLSCREEN = false;
        document.querySelector("#notepad").classList.remove("fullscreen");
    }
    setNotepadFullscreenIcon();   
}
document.querySelector("#notepadFullscreenButton").addEventListener("click", ()=>{
    notepadFullscreen("toggle");
});

function setNotepadFullscreenIcon(){
    let notesCount = notes.filter(element => element != null).length;
    let visibleNotesCount = [...document.querySelectorAll(".notepadCategory")].filter(element => !isHiddenElement(element)).length;

    if(notesCount > 3 && visibleNotesCount == 3 && NOTEPAD_FULLSCREEN == false){
        document.querySelector("#notepadFullscreenButton svg path").setAttribute("d", "M6 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm9 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm9 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z");
    }else if((notesCount <= 3 && NOTEPAD_FULLSCREEN == false) || (visibleNotesCount == 4 && NOTEPAD_FULLSCREEN == false)){
        document.querySelector("#notepadFullscreenButton svg path").setAttribute("d", "M21.414 18.586l2.586-2.586v8h-8l2.586-2.586-5.172-5.172 2.828-2.828 5.172 5.172zm-13.656-8l2.828-2.828-5.172-5.172 2.586-2.586h-8v8l2.586-2.586 5.172 5.172zm10.828-8l-2.586-2.586h8v8l-2.586-2.586-5.172 5.172-2.828-2.828 5.172-5.172zm-8 13.656l-2.828-2.828-5.172 5.172-2.586-2.586v8h8l-2.586-2.586 5.172-5.172z");
    }else if(NOTEPAD_FULLSCREEN == true){
        document.querySelector("#notepadFullscreenButton svg path").setAttribute("d", "M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z");
    }
}

document.querySelector("#notepadTextarea").addEventListener("keydown", function(e){
    if(notes.indexOf(notes.find(el => el !== null)) > -1){
        if(e.which == 9){
            e.preventDefault();
            var start = this.selectionStart;
            var end = this.selectionEnd;
            
            this.value = this.value.substring(0, start) + "\xa0\xa0\xa0" + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 3;
        }
    }
});
document.querySelector("#notepadTextarea").addEventListener("keyup", function(e){
    notes[EDITING_NOTE_INDEX].value = document.querySelector("#notepadTextarea").value;
    saveNotepad();
});

loadSettings();
loadNotepad();
loadSavedQuotes();
loadTodos();
showClockDate();
typeWriter("Witamy Panie Wiktorze!", document.querySelector("#welcome"));

if(window.navigator.onLine){
    getArticles();
    setWeatherCity();
    showCovidChart();
    getRandomQuote();
}else{
    document.querySelectorAll(".widgetConnectionErrorMessage").forEach(element => element.style.display = "flex");
}
window.addEventListener("online", ()=>{
    if(LOAD_OFFLINE) runOnlineWidgets();
    showHideOnlineQuoteOptions("show");
    document.querySelectorAll(".widgetConnectionErrorMessage").forEach(element => element.style.display = "none");
});
window.addEventListener("offline", ()=>{
    showHideOnlineQuoteOptions("hide");
    document.querySelectorAll(".widgetConnectionErrorMessage").forEach(element => element.style.display = "none");
});
document.body.addEventListener("keydown", (e)=>{
    if(e.which == 27){
        notepadFullscreen("hide");
        showHideSavedQuotes("hide");
        todosFullscreen("hide");
        showHideNotepadCategoryForm("hide");
    }
});
document.querySelector("#clickHandler").addEventListener("click", (e)=>{
    showHideConfirmation("hide");
});