/*
  El router. Maneja dos rutas, una es la ruta inicial que muestra la lista de ciudades
  y la otra es la ruta de navegación hacia el tiempo en una ciudad.
  Cada ruta llama al metodo indicado, en el segundo caso lo llama con los
  parametros indicados en la ruta como parametros de la funcion.
*/
var AppRouter = Backbone.Router.extend({
  routes: {
    '' : 'showCities',
    'weather/:country/:city' : 'showWeatherOfCity'
  },

  /*
     La primera vez que entramos a la aplicacion debemos crear la vista de la lista
     de ciudades con una colección vacía. Cuando volvemos de la vista de una ciudad
     simplemente renderizamos la vista con la colección actual, para no perder
     datos.
     El proceso habitual no es este, lo normal es precargar la colección con los
     datos que vengan de un servicio e inicializar la vista con ellos, pero como
     en este caso no se persisten en ningún sitio hay que mantener la misma vista
     siempre para no perderlos.
  */
  showCities: function() {
    if(!this.cityListView) {
      this.cityListView = new CityListView({el: $('#content'), collection: new CityCollection()});
    }
    this.cityListView.render();
  },

  /*
    Para mostrar el tiempo en una ciudad tenemos que consultarlo en el servidor.
    En este caso, como no se trata de una api REST, al hacer fetch del modelo
    le pasamos los parametros de la query string en el objeto "data". También
    pasamos la funcion de callback que recibirá los datos del servidor cuando
    haya una respuesta. Los datos se reciben dentro de un modelo backbone.
  */
  showWeatherOfCity: function(country, city) {
    var model = new City({'country' : country, 'name': city});
    model.fetch({
      data: {
        q : model.get('name') + ',' + model.get('country'),
        lang: 'sp'
      },
      success: function(model) {
        if(model.get('cod') == 200) {
          var weatherView = new WeatherView({model: model, el: $('#content')});
          weatherView.render();
          console.log('rendered');
        } else {
          console.log('error ', model);
        }
      },
      error: function(model){
        console.log("error with: ", model);
      }
    });

  }

});


/*
  Vista de la lista de ciudades.
  Maneja una colección de ciudades y un formulario para añadir una ciudad a la
  colección.
  Cada ciudad que se añade a la colección se mostrará con una vista hija en la
  lista de ciudades, por lo que los botones de borrar ciudad y de ir a otra
  ciudad no se manejan en esta vista.
*/
var CityListView = Backbone.View.extend({
  template: _.template($('#list_template').html()),

  /*
    Enlazamos el evento click del tag con id add_city al metodo addCity.
  */
  events: {
    'click #add_city' : 'addCity'
  },

  /*
    Al renderizar la vista, renderizamos una vista de item por cada elemento
    que tengamos en la colección.
  */
  render: function() {
    this.$el.html(this.template());
    var that = this;
    this.collection.each(function(city) {
      var view = that._createItemView(city);
      that.$('#city_list').append(view.$el);
    });
  },

  /*
    Cuando pulsamos añadir volcamos los datos del formulario en el modelo
    de backbone para la ciudad usando jQuery, y añadimos el nuevo modelo a la
    colección manejada por esta vista. Además tenemos que crear una nueva vista
    de item y añadirla a la lista de items.
  */
  addCity: function() {
    var city = new City({
      'name': this.$('#city_name').val(),
      'country': this.$('#country_code').val()
    });
    this.collection.add(city);
    var view = this._createItemView(city);
    this.$('#city_list').append(view.$el);
  },

  /*
     Creamos la vista de item y nos suscribimos a un evento lanzado por ella
     cuando se pulsa el boton borrar de la linea. De esta forma reaccionamos
     a cada boton de borrar recibiendo directamente la ciudad que se pretende
     borrar y borrandola de la colección de ciudades que manejamos en esta vista
  */
  _createItemView: function(city) {
    var itemView = new CityListItemView({model: city});
    itemView.render();
    var self = this;
    this.listenTo(itemView, 'removeCity', function(city) {
      self.collection.remove(city);
    });
    return itemView;
  }

});

/*
  Vista de cada ciudad en la lista de ciudades.
  Decidimos crear una vista independiente porque hay acciones que se deben llevar
  a cabo para cada ciudad, como borrarla y navegar hacia la pagina de información.
  Teniendo una vista separada, cada ciudad gestiona sus propias acciones.
  Si respondiesemos a estos eventos desde la vista de la lista de ciudades tendríamos
  que extraer el índice del elemento que se está pulsando dentro de la lista explorando
  el DOM, lo que podría dar lugar a errores y comportamientos extraños si no lo
  hiciesemos correctamente.
  Especificamos que el tagName para esta vista es un "li" en lugar de un "div" que es
  el que se establece por defecto. De esta manera, this.el será un "li" que es lo
  que nos interesa tener dentro de un "ul" de ciudades.
*/
var CityListItemView = Backbone.View.extend({
  events: {
    'click [name="remove_city"]' : 'removeCity',
    'click [name="show_weather"]' : 'showWeather'
  },

  tagName: 'li',

  template: _.template($('#item_template').html()),

  /*
    Al renderizar la plantilla le pasamos los datos de nuestro modelo
    en JSON para poder tener la plantilla parametrizada.
  */
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
  },

  /*
    Al borrar una ciudad borramos la propia vista y lanzamos un evento
    para que la vista de la lista de ciudades actue en consecuencia.
  */
  removeCity: function() {
    this.remove();
    this.trigger('removeCity', this.model);
  },

  /*
    Para mostrar el tiempo de la ciudad debemos navegar a traves del router
    a la url correcta para esa ciudad.
    El parametro "trigger" le indica al router que además de añadir la url al
    historial de navegación, ejecute el método correspondiente del router como
    si viniesemos directamente a esa url desde el navegador.
  */
  showWeather: function(e) {
    e.preventDefault();
    var url = 'weather/' + this.model.get('country') + '/' + this.model.get('name');
    router.navigate(url, {trigger: true});
  }
});

/*
  Vista del tiempo en una ciudad.
  Recibe un modelo City precargado con los datos que vienen del servicio.
  Al renderizarse formatea la fecha de salida del sol para pasarsela a la plantilla
  y tener la lógica en el código. También podría formatearse en la plantilla pero
  es una buena practica tener plantillas sin logica.
  Manejamos también el click del botón para volver a la lista de ciudades, lo
  hacemos a través del router.
*/
var WeatherView = Backbone.View.extend({
  events: {
    'click #back' : 'backToCityList'
  },

  template: _.template($('#weather_template').html()),

  render: function() {
    var json = this.model.toJSON();
    json.sunrise = new Date(json.sys.sunrise).toTimeString();
    this.$el.html(this.template(json));
  },

  backToCityList: function() {
    router.navigate('', {trigger: true});
  }
});

/*
  Modelo de ciudad. En la url raiz especificamos la URL del servicio
  donde consultaremos los datos. Despues cargaremos los modelos a traves del
  método fetch, que hace una consulta al servidor para obtener el JSON con los
  datos del modelo.
*/
var City = Backbone.Model.extend({
  urlRoot: 'http://api.openweathermap.org/data/2.5/weather'
});

/*
  Colección de ciudades. No implementamos métodos propios porque es suficiente
  con los que nos provee Backbone.Collection. Se podría obviar esta clase y
  usar Backbone.Collection en este caso, pero es una buena práctica definir todos
  los modelos y colecciones que vamos a manejar en la aplicacion.
*/
var CityCollection = Backbone.Collection.extend({

});

/*
  Iniciamos la aplicación. Creamos el router, que es el único objeto global en
  este caso. Al inicializar el historial de navegación, se navega por defecto a
  la ruta raiz y se ejecuta el método del router que la maneja, con lo que
  la aplicacion arranca mostrando la vista de la lista de ciudades.
*/
var router = new AppRouter();
Backbone.history.start();
