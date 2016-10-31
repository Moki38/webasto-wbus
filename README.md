# Webasto WBUS

*** This is work in Progress, not usable yet! ***

Basic userinterface
 Key 
  - 1: Turn Webasto Heater On
  - 2: Turn Webasto Heater Off

Its a very very basic WBUS interface to my Webasto (EVO-40) with Multicontrol HD.
It looks like a has a newer/other version of WBUS than the other WBUS interface programs.
And maybe i am doing something wrong ;) 

I added this line to UDEV (/etc/udev/rules.d/99-usb-serial.rules)   
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", ATTRS{serial}=="A600AIZO", SYMLINK+="ttyWBUS"

Once again, you may need someting completly different for your setup.

### Install

```
$ npm install 
```

### Usage

```
$ nodejs test.js
```

### Restrictions

This version was tested with a USB ODB2 interface on a Webasto EVO 40 heater with a Multicontrol.

This version has been build/tested with Node v6.
```
$curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
```

ps: I am not real programmer, just a tinker. (watch, think and tinker)
