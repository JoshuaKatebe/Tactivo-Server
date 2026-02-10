Revision: R11 
Review date: 30 October, 2024 
COMMUNICATION TO REMOTE SERVER 
PTS-2 controller has 2 ways for communication with a remote server: 
1. Upload of data to remote server, this is done using HTTP requests sent from the PTS-2 controller to a 
cloud server. The following data can be uploaded by the PTS-2 controller to the remote server (if 
enabled in settings): 
▪ registered pump transactions 
▪ registered tank measurements 
▪ registered in-tank deliveries 
▪ registered alert records 
▪ registered GPS records 
▪ real-time status of the PTS-2 controller and all connected equipment (pumps, probes, price 
boards, readers) 
▪ configuration of the PTS-2 controller 
Also, the remote server can send any request in the controller to make any action (for example to 
authorize a pump) or change any configuration (for example to update prices of the fuel grades or 
update a list of allowed fuel attendants tags). 
2. Full communication between the PTS-2 controller and a remote server, which is done using the 
WebSocket protocol (according to RFC 6455) allowing the remote server to get and set configuration, 
online monitor activity of pumps and tanks, generate reports and others. 
In both cases the PTS-2 controller connects to a remote server as a client, so there is no need to have any 
static IP-address on the place of PTS-2 controller installation.  
Communication of the PTS-2 controller with a remote server is made using commands and responses 
described in jsonPTS communication protocol (own proprietary protocol of Technotrade LLC) – see 
document “jsonPTS communication protocol specification for PTS-2 controller” for more information. 
The PTS-2 controller allows to upload the following information to a remote server: 
1. Information on each performed pump transaction: 
− pump sale start date and time 
− pump sale end date and time 
− pump number 
− nozzle number 
www.technotrade.ua  
page 106 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
− fuel grade ID 
− transaction number 
− pump price 
− dispensed volume 
− dispensed temperature-compensated volume (volume converted to 15 degrees Celsius) 
− dispensed money amount 
− value of volume counter in pump on the transaction end 
− value of money amount totalizer counter in pump on the transaction end 
− value of customer or fuel attendant tag applied for the transaction (the fuel attendant ID card to 
authorize the pump or the customer's discount/loyalty card) 
− ID of a management system authorizing a pump (local POS system or OPT) 
Having this data, the remote server is able to: 
− generate reports with all details on each pump sales done 
− calculate the flow speed of each pump nozzle 
− check if there were stealings of fuel done through authorized sales without the controller control 
(by the pump totalizers counters, which are non-erasable and non-resettable and are incremented 
regardless the transaction is done in manual mode or automatically, so in case if the totalizers 
counters were incremented more than a sale done - then someone was doing a filling when a pump 
is in manual mode, which might be a theft) 
− decide which pump is more attractive and more productive 
− others 
2. Information on each registered tank measurement (the PTS-2 controller uploads the tank 
measurements data to a remote server each time it detects a change in the product height): 
− date and time of measurement 
− tank number 
− probe error 
− alarms present (products height low or high, water height high) 
− product height value 
− water height value 
− product temperature value 
− product volume value 
− water volume value 
− tank ullage volume value 
− product temperature-compensated volume value 
− product density value 
− product mass value 
Having this data, the remote server is able to: 
− have online data for each tank 
− have statistics for each tank usage with a possibility to make forecasting for future needs 
− if combined with data on pumps sales from the tank the remote server is able to generate reports 
on reconciliation meaning to see how much fuel has to be stored in the tank on some moment and 
how much is actually stored there and thus to understand if there is a possible leakage or thefts 
from the tank. 
− others 
www.technotrade.ua  
page 107 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
3. Information on each registered in-tank delivery (the PTS-2 controller itself monitors tanks for in-tank 
deliveries, saves them to database and uploads to a server): 
− date and time of in-tank delivery start 
− date and time of in-tank delivery end 
− tank number 
− product height value on in-tank delivery start 
− product height value on in-tank delivery end 
− water height value on in-tank delivery start 
− water height value on in-tank delivery end 
− product temperature value on in-tank delivery start 
− product temperature value on in-tank delivery end 
− product volume value on in-tank delivery start 
− product volume value on in-tank delivery end 
− product temperature-compensated volume value on in-tank delivery start 
− product temperature-compensated volume value on in-tank delivery end 
− product density value on in-tank delivery start 
− product density value on in-tank delivery end 
− product mass value on in-tank delivery start 
− product mass value on in-tank delivery end 
Having this data, the remote server is able to understand how much fuel was received in each tank. 
4. Found errors and alarms: 
− detected pumps offline status 
− detected pumps errors 
− detected probes offline status 
− detected probes errors 
− detected probes alerts (critical high product height, high product height, low product height, critical 
low product height, high water height) 
− detected tanks leakages 
− detected tanks probes floats stuck 
− detected price-boards offline status 
− detected price-boards errors 
− detected readers offline status 
− detected readers errors 
− operation time of the controller 
− detected absence of power supply 
− low battery voltage 
− high CPU temperature 
− others 
Having this data, the remote server can instantly alarm technical personnel about the found problems to 
quickly solve them and thus keep the petrol stations work stable and safe. 
5. GPS tracking records (in case if the PTS-2 controller is installed inside a fuel delivery truck): 
− date and time of GPS record 
− fuel track latitude value with North/South indicator 
www.technotrade.ua  
page 108 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
− fuel track longitude value with East/West indicator 
− fuel track speed over ground 
− fuel track course over ground 
Having this data, the remote server can display location of the fuel track on the map with indication 
what is its speed and height over ground. Also, it can know in which places the fuel delivery truck made 
fillings and also product level changes in tank were detected (as a mean to define possible stealing of 
fuel along the fuel delivery truck movement). 
6. Online realtime status of each pump (meter), tank probe, GPS receiver, alerts and the PTS-2 
controller: having this information the remote server is able to know everything happening realtime on 
the site. Data is sent each second or faster, the server software can use its own algorithms for 
calculation of various indicators as it was connected to the forecourt equipment itself locally. 
7. PTS-2 controller configuration: the remote server is able to remotely receive configuration from the 
PTS-2 controller and also to update the configuration in the PTS-2 controller. As an example, the remote 
server having sent the fuel grades prices update request to the PTS-2 controllers will automatically 
update of prices on the pumps and in the price boards on the whole network of petrol stations. 
Configuration of communication with remote server is done on Configuration page > Settings tab in 
REMOTE SERVER SETTINGS section. 
Configuration includes filling of the following obligatory fields common for data upload requests and 
WebSocket communication: 
− Server IPv4 address – set here a static IP-address of the remote server or leave value 0.0.0.0 if the 
server does not have a static IP-address 
www.technotrade.ua  
page 109 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
− Domain name – domain name of the server if the server has it, if no – leave this field empty. If the 
remote server does not have a static IP-address – then the PTS-2 controller can resolve the domain 
name into current IP-address, for this a correct DNS server should be configured in section NETWORK 
SETTINGS on Configuration page > Settings tab. 
− Server user – to access the remote server there should be user credential saved in the PTS-2 controller. 
PTS-2 controller stores all users on Configuration page > Users tab. You need to select here the user, 
which credentials should be used for access to the remote server. 
− Timeout of server response – time to wait a response from the server 
Data upload settings allow to select the following options: 
1. Upload pump transactions – checkbox to allow upload each pump sale and the unique request 
identifier (URI) to send the request to this server. There is a total counter of records present in 
controller and counter of records already uploaded to server, which is possible to reset to make the 
controller upload them again to the server.  
NOTE! To make this option work the controller should be configured to save pump transactions to SD 
flash disk, which is configured in parameters for the controller on Configuration page > Parameters 
tab, there select Device as Controller. 
2. Upload tank measurements – checkbox to allow upload each tank measurement change and the 
unique request identifier (URI) to send this request to the server. There is a total counter of records 
present in controller and counter of records already uploaded to server, which is possible to reset to 
make the controller upload them again to the server.  
NOTE! To make this option work the controller should be configured to save tank measurements to SD 
flash disk, which is configured in parameters for the controller on Configuration page > Parameters 
tab, there select Device as Controller. 
3. Upload in-tank deliveries – checkbox to allow upload each registered in-tank delivery and the unique 
request identifier (URI) to send this request to the server. There is a total counter of records present in 
controller and counter of records already uploaded to server, which is possible to reset to make the 
controller upload them again to the server.  
NOTE! To make this option work the controller should be configured to save tank measurements to SD 
flash disk, which is configured in parameters for the controller on Configuration page > Parameters 
tab, there select Device as Controller. Also, a parameter to enable in-tank deliveries should be 
configured for each probe, which is configured on Configuration page > Parameters tab, there select 
Device as Probe. 
4. Upload GPS records – checkbox to allow upload each registered GPS record and the unique request 
identifier (URI) to send this request to the server. There is a total counter of records present in 
controller and counter of records already uploaded to server, which is possible to reset to make the 
controller upload them again to the server.  
NOTE! To make this option work the controller should be configured to save GPS data to SD flash disk, 
which is configured in parameters for the controller on Configuration page > Parameters tab, there 
select Device as Controller. Also, the controller should be equipped with the GPS module and usage of 
the GPS module should be enabled in parameters for the controller, check how it is done in section 
GPS module. 
5. Upload alerts – checkbox to allow upload each registered alert record and the unique request 
identifier (URI) to send this request to the server. There is a total counter of records present in 
controller and counter of records already uploaded to server, which is possible to reset to make the 
controller upload them again to the server.  
www.technotrade.ua  
page 110 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
NOTE! To make this option work the controller should be configured to save alert records to SD flash 
disk, which is configured in parameters for the controller on Configuration page > Parameters tab, 
there select Device as Controller. Also, some of the alerts are configured for tanks on Configuration 
page > Tanks tab. 
6. Upload configuration – checkbox to allow upload PTS-2 controller configuration and the unique 
request identifier (URI) to send this request to the server. New PTS-2 controller configuration is 
automatically uploaded to a remote server once any change in configuration is made. 
7. Upload status – checkbox to allow upload PTS-2 controller status and all equipment connected 
statuses to a remote server record and the unique request identifier (URI) to send this request to the 
server. There is a setting for a period to send status request to the remote server. 
Settings of data upload also include configuration of  
− Server port, where to send the requests 
− Secret key, which to use in order to form message signature sent together with a request to the server 
used to guarantee that the message came to the server originally from the PTS-2 controller (not from 
some other instance) and also that the message was not changed anyhow while sending to the server 
(by the man-in-the-middle) 
Websocket communication settings include to select the following: 
− checkbox to enable Websocket communication 
− unique request identifier (URI) to send this request to the server 
− server port, where to send the requests 
− reconnection period to server – sets a reconnection period to server after previous communication 
was closed in seconds 
www.technotrade.ua  
page 111 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
Resolving possible problems in communication to a remote server 
In case if there are any problems in communication with the remote server – it is possible to check for a 
possible reason in the log. For this you need to enable logging controller in section LOGGING SETTINGS 
enable an option Extended logging for data upload to remote server on Configuration page > Parameters 
tab, there select Device as Controller. 
After this option is enabled, download a log file named SERVER.LOG from Device Information page, it 
contains records on each session of communication with a remote server. 
www.technotrade.ua  
page 112 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
Test of communication with a remote server 
In order to test and see how the PTS-2 controller is uploading the data to a remote server you can use a 
test server of Technotrade LLC company.  
For this set the following configuration in your PTS-2 controller in REMOTE SERVER SETTINGS section (see 
images below): 
− Server IPv4 address: 0.0.0.0 
− Domain name: technotrade.ua 
− Server user: admin (default user) 
− Timeout of server response: 1 
− Upload status: enable, set URI jsonPTS and set period for uploading status requests to 1 second 
− Server port: 80 
− Secret key: leave this field empty and set a checkbox to update previously entered value 
Also, make sure that the PTS-2 controller is connected to the network, which has connection to Internet 
and check that in section NETWORK SETTINGS you have correctly configured the fields: 
− Gateway, which should match the gateway of the network router 
− DNS server, which can resolve the domain name into IP-address (you can use default values 8.8.8.8 
and 8.8.4.4) 
www.technotrade.ua  
page 113 from 229 
PTS-2 FORECOURT CONTROLLER OVER FUEL DISPENSERS AND ATG SYSTEMS FOR PETROL STATIONS 
Revision: R11 
Review date: 30 October, 2024 
After that is done you should see a green checkbox shown in bottom of the REMOTE SERVER SETTINGS 
section meaning that the communication is established well. If there a red mark shown – then something is 
made not correctly, please recheck all the settings or try to check the logs for what can be a reason for the 
problem as it is described in section Resolving possible problems in communication to a remote server. 
After that is done go to website https://www.technotrade.ua/PTS2/Status?PtsId=xxxxxxxxxxxxxxxxxxxxxxxx, 
where xxxxxxxxxxxxxxxxxxxxxxxx is the device identifier of your PTS-2 controller, which you can find on 
Device information page. For example, if your PTS-2 controller device identifier is 
003B00265030500420303531 – 
then 
the 
address 
https://www.technotrade.ua/PTS2/Status?PtsId=003B00265030500420303531.  
should 
You should see status of your PTS-2 controller, which should be automatically updated each second: 
be 
www.technotrade.ua  
page 114 from 229 
