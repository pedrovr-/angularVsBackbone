var CityListView = Backbone.View.extend({
  events: {
    'click #add_city' : 'addCity'
  },

  render: function() {
    this.$('#city_list').empty();
    var that = this;
    this.collection.each(function(city) {
      var view = that._createItemView(city);
      that.$('#city_list').append(view.$el);
    });
  },

  addCity: function() {
    var city = new City();
    city.set('name', this.$('#city_name').val());
    city.set('country', this.$('#country_code').val());
    this.collection.add(city);
    var view = this._createItemView(city);
    this.$('#city_list').append(view.$el);
  },

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

var CityListItemView = Backbone.View.extend({
  events: {
    'click [name="remove_city"]' : 'removeCity',
    'click [name="show_weather"]' : 'showWeather'
  },

  tagName: 'li',

  template: _.template($('#item_template').html()),

  initialize: function() {

  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
  },

  removeCity: function() {
    this.remove();
    this.trigger('removeCity', this.model);
  },

  showWeather: function(e) {
    e.preventDefault();
    var url = 'weather/' + this.model.get('country') + '/' + this.model.get('name');
    router.navigate(url, {trigger: true});
  }
});

var City = Backbone.Model.extend({
  urlRoot: 'http://api.openweathermap.org/data/2.5/weather'

});

var CityCollection = Backbone.Collection.extend({

});

var AppRouter = Backbone.Router.extend({
  routes: {
    '' : 'showCities',
    'weather/:country/:city' : 'showWeatherOfCity'
  },

  showWeatherOfCity: function(country, city) {
    var model = new City({'country' : country, 'name': city});
    model.fetch({
      data: {
        q : model.get('name') + ',' + model.get('country'),
        lang: 'sp'
      },
      success: function(model) {
        console.log("success with: ", model);
        var weatherView = new WeatherView({model: model, el: $('#content')});
        weatherView.render();
        console.log('rendered');
      },
      error: function(model){
        console.log("error with: ", model);
      }
    });

  },

  showCities: function() {
    console.log('show cities');
    if(!this.cityListView) {
      this.cityListView = new CityListView({el: $('#content'), collection: new CityCollection()});
    }
    this.cityListView.render();
  }
});

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

var router = new AppRouter();
Backbone.history.start();
//var app = new AppView();
//app.render();

console.log('initialized');
