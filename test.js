var term = require( 'terminal-kit' ).terminal;
//var wbus = require( 'webasto-wbus' );
var wbus = require( './index.js' );

var date_on = new Date();
var date_now = new Date();

var heater_on = 0;

var webasto_data = {};

function webasto_display() {

  webasto_data=wbus.update();
  console.log(webasto_data);
}

function terminate()
{
    term.grabInput( false ) ;
    wbus.close();
    setTimeout( function() { process.exit() } , 100 ) ;
}

wbus.open('/dev/ttyWBUS');

term.clear();

var displayinterval = setInterval(function () {
     webasto_display();
  }, 2000);

term.on( 'key' , function( name , matches , data ) {
    if ( matches.indexOf ('1') >= 0 ) {
      heater_on = 1;
      wbus.on();
      date_on = new Date();
      term.yellow.moveTo(10,18,'User command:                     ' ) ;
      term.yellow.moveTo(10,18,'User command: Heater ON...\n' ) ;
    }
    if ( matches.indexOf ('2') >= 0 ) {
      heater_on = 0;
      wbus.off();
      term.yellow.moveTo(10,18,'User command:                     ' ) ;
      term.yellow.moveTo(10,18,'User command: Heater OFF...\n' ) ;
    }
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      wbus.close();
      terminate() ;
    }
} ) ;

