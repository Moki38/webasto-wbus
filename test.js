var term = require( 'terminal-kit' ).terminal;
//var wbus = require( 'webasto-wbus' );
var wbus = require( './index.js' );

var date_on = new Date();
var date_now = new Date();

var heater_on = 0;

var webasto_data = {};

function webasto_display() {

  webasto_data=wbus.state();

  term.white.moveTo(1, 2, "CAF: %d",webasto_data.status_caf);
  if (webasto_data.status_caf)  { term.yellow.moveTo(6, 2, "ON "); } else { term.yellow.moveTo(6, 2, "OFF"); }
  term.white.moveTo(1, 3, "FP : %d",webasto_data.status_fp);
  if (webasto_data.status_fp)  { term.yellow.moveTo(6, 3, "ON "); } else { term.yellow.moveTo(6, 3, "OFF"); }
  term.white.moveTo(1, 4, "GP : %d",webasto_data.status_gp);
  if (webasto_data.status_gp)  { term.yellow.moveTo(6, 4, "ON "); } else { term.yellow.moveTo(6, 4, "OFF"); }
  term.white.moveTo(1, 5, "CP : %d",webasto_data.status_cp);
  if (webasto_data.status_cp)  { term.yellow.moveTo(6, 5, "ON "); } else { term.yellow.moveTo(6, 5, "OFF"); }
  term.white.moveTo(1, 6, "VFR: %d",webasto_data.status_vfr);
  if (webasto_data.status_vfr) { term.yellow.moveTo(6, 6, "ON "); } else { term.yellow.moveTo(6, 6, "OFF"); }
  term.white.moveTo(1, 7, "MS : %d",webasto_data.status_ms);
  if (webasto_data.status_ms)  { term.green.moveTo(6, 7, "ON "); } else { term.green.moveTo(6, 7, "OFF"); }
  term.white.moveTo(1, 8, "SHR: %d",webasto_data.status_shr);
  if (webasto_data.status_shr) { term.green.moveTo(6, 8, "ON "); } else { term.green.moveTo(6, 8, "OFF"); }
  term.white.moveTo(1, 9, "FI : %d",webasto_data.status_fi);
  if (webasto_data.status_fi)  { term.red.moveTo(6, 9, "ON "); } else { term.red.moveTo(6, 9, "OFF"); }
  term.white.moveTo(1, 10, "FD : %d",webasto_data.status_fd);
  if (webasto_data.status_fd)  { term.red.moveTo(6, 10, "ON "); } else { term.red.moveTo(6, 10, "OFF"); }

  term.white.moveTo(20, 2, "Temp  (C):             ");
  term.white.moveTo(20, 2, "Temp  (C): " + webasto_data.status_temp);
  term.white.moveTo(20, 3, "Volt  (V):             ");
  term.white.moveTo(20, 3, "Volt  (V): " + webasto_data.status_mvolt);
  term.white.moveTo(20, 4, "Power (W):             ");
  term.white.moveTo(20, 4, "Power (W): " + webasto_data.status_hp);
  term.white.moveTo(20, 5, "FD Ohm(o):             ");
  term.white.moveTo(20, 5, "FD Ohm(o): " + webasto_data.status_fdr);

  term.white.moveTo(20, 7, "GP Power :             ");
  term.white.moveTo(20, 7, "GP Power : " + webasto_data.status_gpp);
  term.white.moveTo(20, 8, "FP Power :             ");
  term.white.moveTo(20, 8, "FP Power : " + webasto_data.status_fpf);
  term.white.moveTo(20, 9, "AF Power :             ");
  term.white.moveTo(20, 9, "AF Power : " + webasto_data.status_afp);

  term.blue.moveTo(10, 14, "Webasto Version  :                                                ");
  term.blue.moveTo(10, 14, "Webasto Version  : %s", webasto_data.info_version);
  term.blue.moveTo(10, 15, "Webasto Device   :                                                ");
  term.blue.moveTo(10, 15, "Webasto Device   : %s", webasto_data.info_devname);
  term.blue.moveTo(10, 16, "Webasto WBUS Code:                                                ");
  term.blue.moveTo(10, 16, "Webasto WBUS Code: %s", webasto_data.info_wbuscode);

  term.white.moveTo(10, 20, "Webasto State:                                                ");
  term.white.moveTo(10, 20, "Webasto State: %s", webasto_data.status_os);
  term.moveTo( 1 , 21) ;

  if (heater_on) {
    date_now = new Date();
    term.yellow.moveTo(40,18,"                      ") ;
    term.yellow.moveTo(40,18,(date_now-date_on)/1000) ;
  } else {
    term.yellow.moveTo(40,18,"                      ") ;
  } 
}

function terminate()
{
    term.grabInput( false ) ;
    wbus.close();
    setTimeout( function() { process.exit() } , 100 ) ;
}

wbus.open();
term.clear();
term.grabInput( { mouse: 'button' } ) ;

var displayinterval = setInterval(function () {
     webasto_display();
  }, 1000);

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
      terminate() ;
    }
} ) ;

