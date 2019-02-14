<?php

class ControllerIndex{
	private $_system;
	private $_hat;
	private $_shoe;
	function __construct()
	{
		header('Content-Type: application/json;charset=utf-8');
		require_once 'libs/config.php'; //Archivo con configuraciones.
		$this->_system = System::singleton();//contiene objeto system
		$_POST 		= json_decode(file_get_contents('php://input'), true);
		require_once 'libs/apps/places/class.places.php';
		$places 	= new Places();
		$what   	= (empty($_POST['what'])) 			? null 		: $_POST['what'];
		$token   	= (empty($_POST['token'])) 			? null 		: $_POST['token'];
		if($token===session_id()){
			if($what==="STREET_NUM"){
				$id = (empty($_POST['id'])) ? 0: $this->_system->nohacker($_POST['id']);
				$nums = $places->getStreetNum($id);
				echo json_encode($nums);
			}else if($what==="CATASTER_REF"){
				$id = (empty($_POST['id'])) ? 0 : $this->_system->nohacker($_POST['id']);
				$cataster = $places->getCatasterRef($id);
				echo json_encode($cataster);
			}else if($what==="CATASTER_REF_POLIGON"){
				$id = (empty($_POST['id'])) ? 0 : $this->_system->nohacker($_POST['id']);
				$cataster = $places->getCatasterRefFromPoligon($id);
				echo json_encode($cataster);
			}else if($what==="CATASTER_REF_COORD"){
				$x = (empty($_POST['x'])) ? 0 : $this->_system->nohacker($_POST['x']);
				$y = (empty($_POST['y'])) ? 0 : $this->_system->nohacker($_POST['y']);
				$cataster = $places->getCatasterRefFromCoord($x,$y);
				echo json_encode($cataster);
			}else if($what==="EQUIPAMENT"){
				$tipus = (empty($_POST['tipus'])) ? 0 : $this->_system->nohacker($_POST['tipus']);
				$equip = $places->getEquipament($tipus);
				echo json_encode($equip);
			}
		}else{
			echo json_encode(array("status"=>"Failed","message"=>"Cross site injection detected","code"=>501));
		}
	}
}

new ControllerIndex();

?>