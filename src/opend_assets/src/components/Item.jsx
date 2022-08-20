import React, { useEffect,useState } from "react";
import logo from "../../assets/logo.png";
import {Actor,HttpAgent } from "@dfinity/agent";
import {idlFactory} from "../../../declarations/nft";
import {idlFactory as tokenIdlFactory} from "../../../declarations/token";
import { Principal} from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {
  const [name, setName] = useState();
  const [owner, setOwner] = useState()
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderhidden, setloaderhidden] = React.useState(true);
  const [blur, setBlur] = useState();
  const [sellstatus,setstatus] = useState(""); 
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);

  const id = props.id;

  const localhost = "http://localhost:8080/";
  const agent = new HttpAgent({host: localhost});
  agent.fetchRootKey();
  let NFTActor;

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory,{
      agent,
      canisterId:id,
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imagecontent=new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob([imagecontent.buffer], { type: "image/png" })
    );
    setName(name);
    setOwner(owner.toText());
    setImage(image);

    if(props.role=="collection"){
      const nftIsListed = await opend.isListed(props.id);
      if(nftIsListed){
        setOwner("OpenD");
        setBlur({filter: "blur(4px)"});
        setstatus("Listed");
      }else{
        setButton(<Button handleClick={handleSell} text={"Sell"}/>);
      }
    }else if(props.role == "discover"){
      const originalOwner = await opend.getoriginalOwner(props.id);
      if(originalOwner.toText() != CURRENT_USER_ID.toText()){
        setButton(<Button handleClick={handleBuy} text={"Buy"}/>); 
      }
      const price = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()}/>);
    }  
  }

  useEffect(()=>{
    loadNFT();
  },[])

  let price;
  function handleSell(){
    setPriceInput(<input
      placeholder="Price in DANG"
      type="number"
      className="price-input"
      value={price}
      onChange={(e)=> price=e.target.value}
    />);
    setButton(<Button handleClick={sellitem} text={"Confirm"}/>)
  }

  async function sellitem(){
    setBlur({filter: "blur(4px)"});
    setloaderhidden(false);
    const listingResult = await opend.listItem(props.id,Number(price));
    if(listingResult == "Success"){
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(openDId);
      if(transferResult=="Success"){
        setloaderhidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setstatus("Listed");
      }
    }
  }
  
  async function handleBuy(){
    console.log("Clicked");
    setloaderhidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
    }) ;

    const sellerId = await opend.getoriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId,itemPrice);
    if(result == "Success"){
      const transferResult = await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log("purchase"+transferResult);
      setloaderhidden(true);
      setDisplay(false);
    }
  }

  return (
    <div style={{display: shouldDisplay ? "inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
          <div hidden={loaderhidden} className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
        {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellstatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
