<?php
class Places {

	private $_system;	
				
	public function __construct(){
		$this->_system = System::singleton();
	}
	
	/* CERCADORS
	******************************/
	
	public function getStreetNum($id){
		//$id = sprintf("%'.04d", $id);
		$query		= "SELECT numero,ST_AsGeoJSON(geom) as geom from carrerer.npolicia where codi='".$id."' ORDER BY length(numero), numero";
	
		$rs 		= $this->_system->pdo_select("bd1",$query);
		$retorno	= array();
		if(count($rs)>0){
			foreach($rs as $row){
				$item 	= array(
					"num"	=> $row['numero'],
					"geom"	=> $row['geom'],
				);
				array_push($retorno, $item);
			}
		}
		return array("status"=>"Accepted","message"=>$retorno,"total"=>count($rs),"code"=>200,"query"=>$query);	
	}

	public function getCatasterRef($id){
		$query		= "SELECT pcat1,pcat2,refcat,coorx,coory,ST_AsGeoJSON(ST_Transform(geom, 3857)) as geom from cadastre.parcelles where refcat='".$id."'";

		$rs 		= $this->_system->pdo_select("bd1",$query);
		$item	= array();
		if(count($rs)>0){
			foreach($rs as $row){
				$item 	= array(
					"pcat1"		=> $row['pcat1'],
					"pcat2"		=> $row['pcat2'],
					"refcat"	=> $row['refcat'],
					"x"			=> (float)$row['coorx'],
					"y"			=> (float)$row['coory'],
					"geom"		=> $row['geom'],
				);
			}
		}
		return array("status"=>"Accepted","message"=>$item,"code"=>200,"query"=>$query);
	}

	public function getCatasterRefFromPoligon($id){
		$query		= "SELECT masa,parcela,refcat,coorx,coory,ST_AsGeoJSON(ST_Transform(geom, 3857)) as geom FROM cadastre.parcelles where masa='".$id."' AND (tipo='R' OR tipo='D') ORDER BY parcela";

		$rs 		= $this->_system->pdo_select("bd1",$query);
		$retorno	= array();
		if(count($rs)>0){
			foreach($rs as $row){
				$item 	= array(
					"masa"		=> $row['masa'],
					"parcela"	=> $row['parcela'],
					"refcat"	=> $row['refcat'],
					"x"			=> (float)$row['coorx'],
					"y"			=> (float)$row['coory'],
					"geom"		=> $row['geom'],
				);
				array_push($retorno, $item);
			}
		}
		return array("status"=>"Accepted","message"=>$retorno,"code"=>200,"query"=>$query);
	}

	public function getCatasterRefFromCoord($x,$y){
		$query		= "SELECT * FROM cadastre.parcelles WHERE ST_Contains(geom, ST_GeomFromText('POINT(".$x." ".$y.")',25831))";

		$rs 		= $this->_system->pdo_select("bd1",$query);
		$item	= array();
		if(count($rs)>0){
			foreach($rs as $row){
				$item 	= array(
					"pcat1"		=> $row['pcat1'],
					"pcat2"		=> $row['pcat2'],
					"refcat"	=> $row['refcat'],
				);
			}
		}
		return array("status"=>"Accepted","message"=>$item,"code"=>200,"query"=>$query);
	}

	//**********************************************************************************************************
	//**********************************************************************************************************
	//*****************************                 END GET CATASTRE 	              ******************************
	//**********************************************************************************************************
	//**********************************************************************************************************

	public function getEquipament($tipus){
		$query		= "SELECT nom,ST_AsGeoJSON(ST_Transform(geom, 25831)) as geom FROM serveis.eq_equipaments WHERE tipus='".$tipus."'";

		$rs 		= $this->_system->pdo_select("bd1",$query);
		$retorno	= array();
		if(count($rs)>0){
			foreach($rs as $row){
				$item 	= array(
					"nom"		=> $row['nom'],
					"geom"		=> $row['geom'],
				);
				array_push($retorno, $item);
			}
		}
		return array("status"=>"Accepted","message"=>$retorno,"code"=>200,"query"=>$query);
	}

	private function _pgConnect(){
		// Connecting, selecting database
		$dbconn = pg_connect("host=localhost dbname=".$this->_system->get('_database_bd1')." user=".$this->_system->get('_user_bd1')." password=".	$this->_system->get('_password_bd1')."") or die('Could not connect: ' . pg_last_error());
		return $dbconn;
	}
}
?>