import dynamic from "next/dynamic";
import React from "react";
import { Toaster } from "react-hot-toast";
type Props = {};

const ToasterWrapper = (props: Props) => {
  return <Toaster />;
};

export default dynamic(() => Promise.resolve(ToasterWrapper), { ssr: false });
