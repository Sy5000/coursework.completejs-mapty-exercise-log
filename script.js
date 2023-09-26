'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnRemoveWorkouts = document.querySelector('.delete__workouts');

// let map, mapEvent; //move between event listeners using global scope
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //placeholder id from time string
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in m
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //getMonth return 0-11, use on months to return month as string
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadance) {
    super(coords, distance, duration);
    this.cadance = cadance;

    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //minPerKm
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// //test
// const run1 = new Running([30, -12], 5.2, 24, 178);
// const ride1 = new Cycling([30, -12], 27, 90, 550);
// console.log(run1, ride1);

//Blueprint
class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];
  constructor() {
    // this.workouts = [];
    //get users position
    this._getPosition();
    //get data from local storage
    this._getLocalStorgae();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not find your position');
        }
      ); //inputs are callback functions x2 (success / failure)
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords; //{} destructuring = position.coords.latitude
    const { longitude } = position.coords;
    //   console.log(position);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude},15z`);

    const coords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //L=leaflet object with library methods eg map.on()
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //map marker
    //Event listener (clicks on map)
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      // this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE; //needed in submit form /save to global
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    //override slide animation
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    //toggle input fields
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    //helper func //loop all inputs and checks for numeric inputs //returns T if all are Num
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    //get data form form
    const type = inputType.value; //from value attribute
    const distance = +inputDistance.value; //+ convert to number???
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //validate (guard clause)
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration)
      )
        return alert('Please input a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //validate
      if (!validInputs(distance, duration, elevation))
        return alert('Please input a positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    //add workout to map with marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //render Admin edit delete etc??
    this._AdminPanel();
    //hide form & clear input fields
    this._hideForm();

    //save workout data to local storage
    this._setLocalStorage();
  }
  _AdminPanel() {
    //delete all workouts
    btnRemoveWorkouts.addEventListener('click', function () {
      app.reset();
    });
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
     <h2 class="workout__title"> ${workout.description}</h2>
     <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadance}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
    //Admin options
    //
    if (workout) {
      btnRemoveWorkouts.classList.remove('hidden');
    }
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout'); //opposite of querySelector
    console.log(workoutEl); //access <li> and attached data-id

    if (!workoutEl) return; //guard clause, click away from El

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    //using the public interface
    // workout.click(); //local storage loses methods from proto chain
  }
  _setLocalStorage() {
    //key-value store //convert obj to str//do not save lrg amounts
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorgae() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return; //guard if there is no data

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work); //will not work as map is not loaded
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//run code on page load
const app = new App();
// console.log(app);

////////////////////Geolocation
// use navigator to access location from browser, save to var, pass to map object
////////////////////Display map marker
// chain methods (from leaflet doc), pass object into L.popup with attribute settings /css class etc for popup
////////////////////Render workout input form
//add event listener, remove form hidden field, (add display marker to submit form event listener),  toggle input fields for forms
////////////////////Project architecture
//implement OOP classes,
////////////////////Project architecture, Refactoring for
// event listeners go into the 'App' class constructor function & behaviour goes into methods (these methods are called by the event listeners by name as arguments) bind the this keyword to make it point to the object
////////////////////Managing workout data
// create parent and child classes, link, test by creating workout objects with test data
////////////////////Creating a new workout
//within app object, add validation & logic to _newWorkout event handler
////////////////////Rendering workouts (list)
//
////////////////////Move to marker on click
//event deligation on workout class (event handler on parent, match to click event)
////////////////////Local storage
//use localstorage API to set key and value convert to string SAVE, convert to object LOAD
//converting back and forth loses the prototype chain, proto methods will be lost

// if (navigator.geolocation) {
//   navigator.geolocation.getCurrentPosition(
//     function (position) {
//       const { latitude } = position.coords; //{} destructuring = position.coords.latitude
//       const { longitude } = position.coords;
//       //   console.log(position);

//       console.log(`https://www.google.com/maps/@${latitude},${longitude},15z`);

//       const coords = [latitude, longitude];

//       map = L.map('map').setView(coords, 14); //L=leaflet object with library methods eg map.on()
//       console.log(map);

//       L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//         attribution:
//           '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//       }).addTo(map);

//       //map marker
//       //Event listener (clicks on map)
//       map.on('click', function (mapE) {
//         mapEvent = mapE; //needed in submit form /save to glabal
//         form.classList.remove('hidden');
//         inputDistance.focus();
//       });
//     },

//     function () {
//       alert('Could not find your position');
//     }
//   ); //inputs are callback functions x2 (success / failure)
// }

// form.addEventListener('submit', function (e) {
//   console.log(mapEvent);
//   e.preventDefault();

//   //clear input fields
//   inputDistance.value =
//     inputDuration.value =
//     inputCadence.value =
//     inputElevation.value =
//       '';

//   //Display marker
//   const { lat, lng } = mapEvent.latlng;
//   L.marker([lat, lng])
//     .addTo(map)
//     .bindPopup(
//       L.popup({
//         maxWidth: 250,
//         minWidth: 50,
//         autoClose: false,
//         closeOnClick: false,
//         className: 'running-popup',
//       })
//     )
//     .setPopupContent('Workout!')
//     .openPopup();
// });

// inputType.addEventListener('change', function () {
//   //toggle input fields
//   inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
//   inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
// });

//Attempt without tutorial
//pull workout from workout array using loop,add details to popup
// renderWorkoutList(workout) {
//   // console.log('workout here', workout.distance);
//   if (workout.type === 'running') {
//     containerWorkouts.innerHTML = `<li class="workout workout--running" data-id="${workout.id}">
//     <h2 class="workout__title">Running on ${workout.date}</h2>
//     <div class="workout__details">
//       <span class="workout__icon">🏃‍♂️</span>
//       <span class="workout__value">${workout.distance}</span>
//       <span class="workout__unit">km</span>
//     </div>
//     <div class="workout__details">
//       <span class="workout__icon">⏱</span>
//       <span class="workout__value">${workout.duration}</span>
//       <span class="workout__unit">min</span>
//     </div>
//     <div class="workout__details">
//       <span class="workout__icon">⚡️</span>
//       <span class="workout__value">${workout.pace}</span>
//       <span class="workout__unit">min/km</span>
//     </div>
//     <div class="workout__details">
//       <span class="workout__icon">🦶🏼</span>
//       <span class="workout__value">${workout.cadance}</span>
//       <span class="workout__unit">spm</span>
//     </div>
//   </li>`;
//   }
// }
